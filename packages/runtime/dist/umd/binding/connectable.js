(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../utilities-objects.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BindingMediator = exports.connectable = exports.BindingObserverRecord = exports.getRecord = exports.unobserve = exports.observeProperty = exports.addObserver = void 0;
    const utilities_objects_js_1 = require("../utilities-objects.js");
    // TODO: add connect-queue (or something similar) back in when everything else is working, to improve startup time
    const slotNames = [];
    const versionSlotNames = [];
    let lastSlot = -1;
    function ensureEnoughSlotNames(currentSlot) {
        if (currentSlot === lastSlot) {
            lastSlot += 5;
            const ii = slotNames.length = versionSlotNames.length = lastSlot + 1;
            for (let i = currentSlot + 1; i < ii; ++i) {
                slotNames[i] = `_o${i}`;
                versionSlotNames[i] = `_v${i}`;
            }
        }
    }
    ensureEnoughSlotNames(-1);
    /** @internal */
    function addObserver(observer) {
        this.record.add(observer);
    }
    exports.addObserver = addObserver;
    /** @internal */
    function observeProperty(obj, key) {
        const observer = this.observerLocator.getObserver(obj, key);
        /* Note: we need to cast here because we can indeed get an accessor instead of an observer,
         *  in which case the call to observer.subscribe will throw. It's not very clean and we can solve this in 2 ways:
         *  1. Fail earlier: only let the locator resolve observers from .getObserver, and throw if no branches are left (e.g. it would otherwise return an accessor)
         *  2. Fail silently (without throwing): give all accessors a no-op subscribe method
         *
         * We'll probably want to implement some global configuration (like a "strict" toggle) so users can pick between enforced correctness vs. ease-of-use
         */
        this.addObserver(observer);
    }
    exports.observeProperty = observeProperty;
    /** @internal */
    function unobserve(all) {
        this.record.clear(all);
    }
    exports.unobserve = unobserve;
    function getRecord() {
        const record = new BindingObserverRecord(this);
        utilities_objects_js_1.defineHiddenProp(this, 'record', record);
        return record;
    }
    exports.getRecord = getRecord;
    class BindingObserverRecord {
        constructor(binding) {
            this.binding = binding;
            this.version = 0;
            this.count = 0;
            connectable.assignIdTo(this);
        }
        handleChange(value, oldValue, flags) {
            return this.binding.interceptor.handleChange(value, oldValue, flags);
        }
        /**
         * Add, and subscribe to a given observer
         */
        add(observer) {
            // find the observer.
            const observerSlots = this.count == null ? 0 : this.count;
            let i = observerSlots;
            while (i-- && this[slotNames[i]] !== observer)
                ;
            // if we are not already observing, put the observer in an open slot and subscribe.
            if (i === -1) {
                i = 0;
                while (this[slotNames[i]]) {
                    i++;
                }
                this[slotNames[i]] = observer;
                observer.subscribe(this);
                observer[this.id] |= 8 /* updateTarget */;
                // increment the slot count.
                if (i === observerSlots) {
                    this.count = i + 1;
                }
            }
            this[versionSlotNames[i]] = this.version;
            ensureEnoughSlotNames(i);
        }
        /**
         * Unsubscribe the observers that are not up to date with the record version
         */
        clear(all) {
            const slotCount = this.count;
            let slotName;
            let observer;
            if (all === true) {
                for (let i = 0; i < slotCount; ++i) {
                    slotName = slotNames[i];
                    observer = this[slotName];
                    if (observer != null) {
                        this[slotName] = void 0;
                        observer.unsubscribe(this);
                        observer[this.id] &= ~8 /* updateTarget */;
                    }
                }
                this.count = 0;
            }
            else {
                for (let i = 0; i < slotCount; ++i) {
                    if (this[versionSlotNames[i]] !== this.version) {
                        slotName = slotNames[i];
                        observer = this[slotName];
                        if (observer != null) {
                            this[slotName] = void 0;
                            observer.unsubscribe(this);
                            observer[this.id] &= ~8 /* updateTarget */;
                            this.count--;
                        }
                    }
                }
            }
        }
    }
    exports.BindingObserverRecord = BindingObserverRecord;
    function connectableDecorator(target) {
        const proto = target.prototype;
        utilities_objects_js_1.ensureProto(proto, 'observeProperty', observeProperty, true);
        utilities_objects_js_1.ensureProto(proto, 'unobserve', unobserve, true);
        utilities_objects_js_1.ensureProto(proto, 'addObserver', addObserver, true);
        Reflect.defineProperty(proto, 'record', {
            configurable: true,
            get: getRecord,
        });
        return target;
    }
    function connectable(target) {
        return target == null ? connectableDecorator : connectableDecorator(target);
    }
    exports.connectable = connectable;
    let value = 0;
    connectable.assignIdTo = (instance) => {
        instance.id = ++value;
    };
    // @connectable
    class BindingMediator {
        constructor(key, binding, observerLocator, locator) {
            this.key = key;
            this.binding = binding;
            this.observerLocator = observerLocator;
            this.locator = locator;
            this.interceptor = this;
            connectable.assignIdTo(this);
        }
        $bind(flags, scope, hostScope, projection) {
            throw new Error('Method not implemented.');
        }
        $unbind(flags) {
            throw new Error('Method not implemented.');
        }
        handleChange(newValue, previousValue, flags) {
            this.binding[this.key](newValue, previousValue, flags);
        }
    }
    exports.BindingMediator = BindingMediator;
    connectableDecorator(BindingMediator);
});
//# sourceMappingURL=connectable.js.map