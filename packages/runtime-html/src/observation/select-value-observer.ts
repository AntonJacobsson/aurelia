import {
  CollectionKind,
  LifecycleFlags as LF,
  subscriberCollection,
  AccessorType,
} from '@aurelia/runtime';

import type { INode } from '../dom';
import type { EventSubscriber } from './event-delegator';
import type {
  ICollectionObserver,
  IndexMap,
  IObserver,
  IObserverLocator,
  ISubscriber,
  ISubscriberCollection,
} from '@aurelia/runtime';

const hasOwn = Object.prototype.hasOwnProperty;
const childObserverOptions = {
  childList: true,
  subtree: true,
  characterData: true
};

function defaultMatcher(a: unknown, b: unknown): boolean {
  return a === b;
}

export interface ISelectElement extends HTMLSelectElement {
  options: HTMLCollectionOf<IOptionElement> & Pick<HTMLOptionsCollection, 'length' | 'selectedIndex' | 'add' | 'remove'>;
  matcher?: typeof defaultMatcher;
}
export interface IOptionElement extends HTMLOptionElement {
  model?: unknown;
}

export interface SelectValueObserver extends
  ISubscriberCollection {}

export class SelectValueObserver implements IObserver {
  public currentValue: unknown = void 0;
  public oldValue: unknown = void 0;

  public readonly obj: ISelectElement;

  public hasChanges: boolean = false;
  // ObserverType.Layout is not always true
  // but for simplicity, always treat as such
  public type: AccessorType = AccessorType.Node | AccessorType.Observer | AccessorType.Layout;

  public arrayObserver?: ICollectionObserver<CollectionKind.array> = void 0;
  public nodeObserver?: MutationObserver = void 0;

  private observing: boolean = false;

  public constructor(
    obj: INode,
    // deepscan-disable-next-line
    _key: PropertyKey,
    public readonly handler: EventSubscriber,
    public readonly observerLocator: IObserverLocator,
  ) {
    this.obj = obj as ISelectElement;
  }

  public getValue(): unknown {
    // is it safe to assume the observer has the latest value?
    // todo: ability to turn on/off cache based on type
    return this.observing
      ? this.currentValue
      : this.obj.multiple
        ? Array.from(this.obj.options).map(o => o.value)
        : this.obj.value;
  }

  public setValue(newValue: unknown, flags: LF): void {
    this.currentValue = newValue;
    this.hasChanges = newValue !== this.oldValue;
    this.observeArray(newValue instanceof Array ? newValue : null);
    if ((flags & LF.noFlush) === 0) {
      this.flushChanges(flags);
    }
  }

  public flushChanges(flags: LF): void {
    if (this.hasChanges) {
      this.hasChanges = false;
      this.synchronizeOptions();
    }
  }

  public handleCollectionChange(): void {
    // always sync "selected" property of <options/>
    // immediately whenever the array notifies its mutation
    this.synchronizeOptions();
  }

  public notify(flags: LF): void {
    if ((flags & LF.fromBind) > 0) {
      return;
    }
    const oldValue = this.oldValue;
    const newValue = this.currentValue;
    if (newValue === oldValue) {
      return;
    }
    this.callSubscribers(newValue, oldValue, flags);
  }

  public handleEvent(): void {
    const shouldNotify = this.synchronizeValue();
    if (shouldNotify) {
      this.callSubscribers(this.currentValue, this.oldValue, LF.none);
    }
  }

  public synchronizeOptions(indexMap?: IndexMap): void {
    const { currentValue, obj } = this;
    const isArray = Array.isArray(currentValue);
    const matcher = obj.matcher !== void 0 ? obj.matcher : defaultMatcher;
    const options = obj.options;
    let i = options.length;

    while (i-- > 0) {
      const option = options[i];
      const optionValue = hasOwn.call(option, 'model') ? option.model : option.value;
      if (isArray) {
        option.selected = (currentValue as unknown[]).findIndex(item => !!matcher(optionValue, item)) !== -1;
        continue;
      }
      option.selected = !!matcher(optionValue, currentValue);
    }
  }

  public synchronizeValue(): boolean {
    // Spec for synchronizing value from `<select/>`  to `SelectObserver`
    // When synchronizing value to observed <select/> element, do the following steps:
    // A. If `<select/>` is multiple
    //    1. Check if current value, called `currentValue` is an array
    //      a. If not an array, return true to signal value has changed
    //      b. If is an array:
    //        i. gather all current selected <option/>, in to array called `values`
    //        ii. loop through the `currentValue` array and remove items that are nolonger selected based on matcher
    //        iii. loop through the `values` array and add items that are selected based on matcher
    //        iv. Return false to signal value hasn't changed
    // B. If the select is single
    //    1. Let `value` equal the first selected option, if no option selected, then `value` is `null`
    //    2. assign `this.currentValue` to `this.oldValue`
    //    3. assign `value` to `this.currentValue`
    //    4. return `true` to signal value has changed
    const obj = this.obj;
    const options = obj.options;
    const len = options.length;
    const currentValue = this.currentValue;
    let i = 0;

    if (obj.multiple) {
      // A.
      if (!(currentValue instanceof Array)) {
        // A.1.a
        return true;
      }
      // A.1.b
      // multi select
      let option: IOptionElement;
      const matcher = obj.matcher || defaultMatcher;
      // A.1.b.i
      const values: unknown[] = [];
      while (i < len) {
        option = options[i];
        if (option.selected) {
          values.push(hasOwn.call(option, 'model')
            ? option.model
            : option.value
          );
        }
        ++i;
      }
      // A.1.b.ii
      i = 0;
      while (i < currentValue.length) {
        const a = currentValue[i];
        // Todo: remove arrow fn
        if (values.findIndex(b => !!matcher(a, b)) === -1) {
          currentValue.splice(i, 1);
        } else {
          ++i;
        }
      }
      // A.1.b.iii
      i = 0;
      while (i < values.length) {
        const a = values[i];
        // Todo: remove arrow fn
        if (currentValue.findIndex(b => !!matcher(a, b)) === -1) {
          currentValue.push(a);
        }
        ++i;
      }
      // A.1.b.iv
      return false;
    }
    // B. single select
    // B.1
    let value: unknown = null;
    while (i < len) {
      const option = options[i];
      if (option.selected) {
        value = hasOwn.call(option, 'model')
          ? option.model
          : option.value;
        break;
      }
      ++i;
    }
    // B.2
    this.oldValue = this.currentValue;
    // B.3
    this.currentValue = value;
    // B.4
    return true;
  }

  private start(): void {
    (this.nodeObserver = new this.obj.ownerDocument.defaultView!.MutationObserver(this.handleNodeChange.bind(this)))
      .observe(this.obj, childObserverOptions);
    this.observeArray(this.currentValue instanceof Array ? this.currentValue : null);
    this.observing = true;
  }

  private stop(): void {
    this.nodeObserver!.disconnect();
    this.nodeObserver = null!;

    if (this.arrayObserver) {
      this.arrayObserver.unsubscribeFromCollection(this);
      this.arrayObserver = null!;
    }
    this.observing = false;
  }

  // todo: observe all kind of collection
  private observeArray(array: unknown[] | null): void {
    if (array != null && !this.obj.multiple) {
      throw new Error('Only null or Array instances can be bound to a multi-select.');
    }
    if (this.arrayObserver) {
      this.arrayObserver.unsubscribeFromCollection(this);
      this.arrayObserver = void 0;
    }
    if (array != null) {
      (this.arrayObserver = this.observerLocator.getArrayObserver(array)).subscribeToCollection(this);
    }
  }

  public handleNodeChange(): void {
    this.synchronizeOptions();
    const shouldNotify = this.synchronizeValue();
    if (shouldNotify) {
      this.notify(LF.none);
    }
  }

  public subscribe(subscriber: ISubscriber): void {
    if (!this.hasSubscribers()) {
      this.handler.subscribe(this.obj, this);
      this.start();
    }
    this.addSubscriber(subscriber);
  }

  public unsubscribe(subscriber: ISubscriber): void {
    this.removeSubscriber(subscriber);
    if (!this.hasSubscribers()) {
      this.handler.dispose();
      this.stop();
    }
  }
}

subscriberCollection()(SelectValueObserver);
