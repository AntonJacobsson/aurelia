import { LifecycleFlags, subscriberCollection, AccessorType } from '@aurelia/runtime';
import { IPlatform } from '../platform.js';

import type { IObserver, IObserverLocator, ISubscriber, ISubscriberCollection } from '@aurelia/runtime';

export interface IHtmlElement extends HTMLElement {
  $mObserver: MutationObserver;
  $eMObservers: Set<ElementMutationSubscription>;
}

export interface ElementMutationSubscription {
  handleMutation(mutationRecords: MutationRecord[]): void;
}

export interface AttributeObserver extends
  IObserver,
  ISubscriber,
  ISubscriberCollection { }

/**
 * Observer for handling two-way binding with attributes
 * Has different strategy for class/style and normal attributes
 * TODO: handle SVG/attributes with namespace
 */
export class AttributeObserver implements AttributeObserver, ElementMutationSubscription {
  public currentValue: unknown = null;
  public oldValue: unknown = null;

  public hasChanges: boolean = false;
  // layout is not certain, depends on the attribute being flushed to owner element
  // but for simple start, always treat as such
  public type: AccessorType = AccessorType.Node | AccessorType.Observer | AccessorType.Layout;

  public constructor(
    private readonly platform: IPlatform,
    public readonly observerLocator: IObserverLocator,
    public readonly obj: IHtmlElement,
    public readonly propertyKey: string,
    public readonly targetAttribute: string,
  ) {
  }

  public getValue(): unknown {
    // is it safe to assume the observer has the latest value?
    // todo: ability to turn on/off cache based on type
    return this.currentValue;
  }

  public setValue(newValue: unknown, flags: LifecycleFlags): void {
    this.currentValue = newValue;
    this.hasChanges = newValue !== this.oldValue;
    if ((flags & LifecycleFlags.noFlush) === 0) {
      this.flushChanges(flags);
    }
  }

  public flushChanges(flags: LifecycleFlags): void {
    if (this.hasChanges) {
      this.hasChanges = false;
      const currentValue = this.currentValue;
      this.oldValue = currentValue;
      switch (this.targetAttribute) {
        case 'class': {
          // Why does class attribute observer setValue look different with class attribute accessor?
          // ==============
          // For class list
          // newValue is simply checked if truthy or falsy
          // and toggle the class accordingly
          // -- the rule of this is quite different to normal attribute
          //
          // for class attribute, observer is different in a way that it only observes one class at a time
          // this also comes from syntax, where it would typically be my-class.class="someProperty"
          //
          // so there is no need for separating class by space and add all of them like class accessor
          //
          // note: not using .toggle API so that environment with broken impl (IE11) won't need to polfyfill by default
          if (!!currentValue) {
            this.obj.classList.add(this.propertyKey);
          } else {
            this.obj.classList.remove(this.propertyKey);
          }
          break;
        }
        case 'style': {
          let priority = '';
          let newValue = currentValue as string;
          if (typeof newValue === 'string' && newValue.includes('!important')) {
            priority = 'important';
            newValue = newValue.replace('!important', '');
          }
          this.obj.style.setProperty(this.propertyKey, newValue, priority);
        }
      }
    }
  }

  public handleMutation(mutationRecords: MutationRecord[]): void {
    let shouldProcess = false;
    for (let i = 0, ii = mutationRecords.length; ii > i; ++i) {
      const record = mutationRecords[i];
      if (record.type === 'attributes' && record.attributeName === this.propertyKey) {
        shouldProcess = true;
        break;
      }
    }

    if (shouldProcess) {
      let newValue;
      switch (this.targetAttribute) {
        case 'class':
          newValue = this.obj.classList.contains(this.propertyKey);
          break;
        case 'style':
          newValue = this.obj.style.getPropertyValue(this.propertyKey);
          break;
        default:
          throw new Error(`Unsupported targetAttribute: ${this.targetAttribute}`);
      }

      if (newValue !== this.currentValue) {
        const { currentValue } = this;
        this.currentValue = this.oldValue = newValue;
        this.hasChanges = false;
        this.callSubscribers(newValue, currentValue, LifecycleFlags.none);
      }
    }
  }

  public subscribe(subscriber: ISubscriber): void {
    if (!this.hasSubscribers()) {
      this.currentValue = this.oldValue = this.obj.getAttribute(this.propertyKey);
      startObservation(this.platform.MutationObserver, this.obj, this);
    }
    this.addSubscriber(subscriber);
  }

  public unsubscribe(subscriber: ISubscriber): void {
    this.removeSubscriber(subscriber);
    if (!this.hasSubscribers()) {
      stopObservation(this.obj, this);
    }
  }
}

subscriberCollection()(AttributeObserver);

const startObservation = ($MutationObserver: typeof MutationObserver, element: IHtmlElement, subscription: ElementMutationSubscription): void => {
  if (element.$eMObservers === undefined) {
    element.$eMObservers = new Set();
  }
  if (element.$mObserver === undefined) {
    (element.$mObserver = new $MutationObserver(handleMutation)).observe(element, { attributes: true });
  }
  element.$eMObservers.add(subscription);
};

const stopObservation = (element: IHtmlElement, subscription: ElementMutationSubscription): boolean => {
  const $eMObservers = element.$eMObservers;
  if ($eMObservers && $eMObservers.delete(subscription)) {
    if ($eMObservers.size === 0) {
      element.$mObserver.disconnect();
      element.$mObserver = undefined!;
    }
    return true;
  }
  return false;
};

const handleMutation = (mutationRecords: MutationRecord[]): void => {
  (mutationRecords[0].target as IHtmlElement).$eMObservers.forEach(invokeHandleMutation, mutationRecords);
};

function invokeHandleMutation(this: MutationRecord[], s: ElementMutationSubscription): void {
  s.handleMutation(this);
}
