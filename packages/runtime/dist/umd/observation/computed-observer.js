(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./subscriber-collection.js", "./connectable-switcher.js", "../binding/connectable.js", "./proxy-observation.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ComputedObserver = void 0;
    const subscriber_collection_js_1 = require("./subscriber-collection.js");
    const connectable_switcher_js_1 = require("./connectable-switcher.js");
    const connectable_js_1 = require("../binding/connectable.js");
    const proxy_observation_js_1 = require("./proxy-observation.js");
    class ComputedObserver {
        constructor(obj, get, set, useProxy, observerLocator) {
            this.obj = obj;
            this.get = get;
            this.set = set;
            this.useProxy = useProxy;
            this.observerLocator = observerLocator;
            this.interceptor = this;
            this.type = 4 /* Obj */;
            this.value = void 0;
            /**
             * @internal
             */
            this.subCount = 0;
            // todo: maybe use a counter allow recursive call to a certain level
            /**
             * @internal
             */
            this.running = false;
            this.isDirty = false;
            connectable_js_1.connectable.assignIdTo(this);
        }
        static create(obj, key, descriptor, observerLocator, useProxy) {
            const getter = descriptor.get;
            const setter = descriptor.set;
            const observer = new ComputedObserver(obj, getter, setter, useProxy, observerLocator);
            const $get = (( /* Computed Observer */) => observer.getValue());
            $get.getObserver = () => observer;
            Reflect.defineProperty(obj, key, {
                enumerable: descriptor.enumerable,
                configurable: true,
                get: $get,
                set: (/* Computed Observer */ v) => {
                    observer.setValue(v, 0 /* none */);
                },
            });
            return observer;
        }
        getValue() {
            if (this.subCount === 0) {
                return this.get.call(this.obj, this);
            }
            if (this.isDirty) {
                this.compute();
                this.isDirty = false;
            }
            return this.value;
        }
        // deepscan-disable-next-line
        setValue(v, _flags) {
            if (typeof this.set === 'function') {
                if (v !== this.value) {
                    // setting running true as a form of batching
                    this.running = true;
                    this.set.call(this.obj, v);
                    this.running = false;
                    this.run();
                }
            }
            else {
                throw new Error('Property is readonly');
            }
        }
        handleChange() {
            this.isDirty = true;
            if (this.subCount > 0) {
                this.run();
            }
        }
        handleCollectionChange() {
            this.isDirty = true;
            if (this.subCount > 0) {
                this.run();
            }
        }
        subscribe(subscriber) {
            // in theory, a collection subscriber could be added before a property subscriber
            // and it should be handled similarly in subscribeToCollection
            // though not handling for now, and wait until the merge of normal + collection subscription
            if (this.addSubscriber(subscriber) && ++this.subCount === 1) {
                this.compute();
                this.isDirty = false;
            }
        }
        unsubscribe(subscriber) {
            if (this.removeSubscriber(subscriber) && --this.subCount === 0) {
                this.isDirty = true;
                this.record.clear(true);
                this.cRecord.clear(true);
            }
        }
        run() {
            if (this.running) {
                return;
            }
            const oldValue = this.value;
            const newValue = this.compute();
            this.isDirty = false;
            if (!Object.is(newValue, oldValue)) {
                // should optionally queue
                this.callSubscribers(newValue, oldValue, 0 /* none */);
            }
        }
        compute() {
            this.running = true;
            this.record.version++;
            try {
                connectable_switcher_js_1.enterConnectable(this);
                return this.value = proxy_observation_js_1.unwrap(this.get.call(this.useProxy ? proxy_observation_js_1.wrap(this.obj) : this.obj, this));
            }
            finally {
                this.record.clear(false);
                this.cRecord.clear(false);
                this.running = false;
                connectable_switcher_js_1.exitConnectable(this);
            }
        }
    }
    exports.ComputedObserver = ComputedObserver;
    connectable_js_1.connectable(ComputedObserver);
    subscriber_collection_js_1.subscriberCollection()(ComputedObserver);
});
//# sourceMappingURL=computed-observer.js.map