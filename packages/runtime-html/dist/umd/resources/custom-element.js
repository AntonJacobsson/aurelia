(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "@aurelia/kernel", "@aurelia/runtime", "../bindable.js", "../dom.js", "../templating/children.js", "../watch.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CustomElement = exports.CustomElementDefinition = exports.strict = exports.containerless = exports.useShadowDOM = exports.customElement = void 0;
    const kernel_1 = require("@aurelia/kernel");
    const runtime_1 = require("@aurelia/runtime");
    const bindable_js_1 = require("../bindable.js");
    const dom_js_1 = require("../dom.js");
    const children_js_1 = require("../templating/children.js");
    const watch_js_1 = require("../watch.js");
    function customElement(nameOrDef) {
        return function (target) {
            return exports.CustomElement.define(nameOrDef, target);
        };
    }
    exports.customElement = customElement;
    function useShadowDOM(targetOrOptions) {
        if (targetOrOptions === void 0) {
            return function ($target) {
                exports.CustomElement.annotate($target, 'shadowOptions', { mode: 'open' });
            };
        }
        if (typeof targetOrOptions !== 'function') {
            return function ($target) {
                exports.CustomElement.annotate($target, 'shadowOptions', targetOrOptions);
            };
        }
        exports.CustomElement.annotate(targetOrOptions, 'shadowOptions', { mode: 'open' });
    }
    exports.useShadowDOM = useShadowDOM;
    function containerless(target) {
        if (target === void 0) {
            return function ($target) {
                exports.CustomElement.annotate($target, 'containerless', true);
            };
        }
        exports.CustomElement.annotate(target, 'containerless', true);
    }
    exports.containerless = containerless;
    function strict(target) {
        if (target === void 0) {
            return function ($target) {
                exports.CustomElement.annotate($target, 'isStrictBinding', true);
            };
        }
        exports.CustomElement.annotate(target, 'isStrictBinding', true);
    }
    exports.strict = strict;
    const definitionLookup = new WeakMap();
    class CustomElementDefinition {
        constructor(Type, name, aliases, key, cache, template, instructions, dependencies, injectable, needsCompile, surrogates, bindables, childrenObservers, containerless, isStrictBinding, shadowOptions, hasSlots, enhance, projectionsMap, watches) {
            this.Type = Type;
            this.name = name;
            this.aliases = aliases;
            this.key = key;
            this.cache = cache;
            this.template = template;
            this.instructions = instructions;
            this.dependencies = dependencies;
            this.injectable = injectable;
            this.needsCompile = needsCompile;
            this.surrogates = surrogates;
            this.bindables = bindables;
            this.childrenObservers = childrenObservers;
            this.containerless = containerless;
            this.isStrictBinding = isStrictBinding;
            this.shadowOptions = shadowOptions;
            this.hasSlots = hasSlots;
            this.enhance = enhance;
            this.projectionsMap = projectionsMap;
            this.watches = watches;
        }
        static create(nameOrDef, Type = null) {
            if (Type === null) {
                const def = nameOrDef;
                if (typeof def === 'string') {
                    throw new Error(`Cannot create a custom element definition with only a name and no type: ${nameOrDef}`);
                }
                // eslint-disable-next-line @typescript-eslint/unbound-method
                const name = kernel_1.fromDefinitionOrDefault('name', def, exports.CustomElement.generateName);
                if (typeof def.Type === 'function') {
                    // This needs to be a clone (it will usually be the compiler calling this signature)
                    // TODO: we need to make sure it's documented that passing in the type via the definition (while passing in null
                    // as the "Type" parameter) effectively skips type analysis, so it should only be used this way for cloning purposes.
                    Type = def.Type;
                }
                else {
                    Type = exports.CustomElement.generateType(kernel_1.pascalCase(name));
                }
                return new CustomElementDefinition(Type, name, kernel_1.mergeArrays(def.aliases), kernel_1.fromDefinitionOrDefault('key', def, () => exports.CustomElement.keyFrom(name)), kernel_1.fromDefinitionOrDefault('cache', def, () => 0), kernel_1.fromDefinitionOrDefault('template', def, () => null), kernel_1.mergeArrays(def.instructions), kernel_1.mergeArrays(def.dependencies), kernel_1.fromDefinitionOrDefault('injectable', def, () => null), kernel_1.fromDefinitionOrDefault('needsCompile', def, () => true), kernel_1.mergeArrays(def.surrogates), bindable_js_1.Bindable.from(def.bindables), children_js_1.Children.from(def.childrenObservers), kernel_1.fromDefinitionOrDefault('containerless', def, () => false), kernel_1.fromDefinitionOrDefault('isStrictBinding', def, () => false), kernel_1.fromDefinitionOrDefault('shadowOptions', def, () => null), kernel_1.fromDefinitionOrDefault('hasSlots', def, () => false), kernel_1.fromDefinitionOrDefault('enhance', def, () => false), kernel_1.fromDefinitionOrDefault('projectionsMap', def, () => new Map()), kernel_1.fromDefinitionOrDefault('watches', def, () => kernel_1.emptyArray));
            }
            // If a type is passed in, we ignore the Type property on the definition if it exists.
            // TODO: document this behavior
            if (typeof nameOrDef === 'string') {
                return new CustomElementDefinition(Type, nameOrDef, kernel_1.mergeArrays(exports.CustomElement.getAnnotation(Type, 'aliases'), Type.aliases), exports.CustomElement.keyFrom(nameOrDef), kernel_1.fromAnnotationOrTypeOrDefault('cache', Type, () => 0), kernel_1.fromAnnotationOrTypeOrDefault('template', Type, () => null), kernel_1.mergeArrays(exports.CustomElement.getAnnotation(Type, 'instructions'), Type.instructions), kernel_1.mergeArrays(exports.CustomElement.getAnnotation(Type, 'dependencies'), Type.dependencies), kernel_1.fromAnnotationOrTypeOrDefault('injectable', Type, () => null), kernel_1.fromAnnotationOrTypeOrDefault('needsCompile', Type, () => true), kernel_1.mergeArrays(exports.CustomElement.getAnnotation(Type, 'surrogates'), Type.surrogates), bindable_js_1.Bindable.from(...bindable_js_1.Bindable.getAll(Type), exports.CustomElement.getAnnotation(Type, 'bindables'), Type.bindables), children_js_1.Children.from(...children_js_1.Children.getAll(Type), exports.CustomElement.getAnnotation(Type, 'childrenObservers'), Type.childrenObservers), kernel_1.fromAnnotationOrTypeOrDefault('containerless', Type, () => false), kernel_1.fromAnnotationOrTypeOrDefault('isStrictBinding', Type, () => false), kernel_1.fromAnnotationOrTypeOrDefault('shadowOptions', Type, () => null), kernel_1.fromAnnotationOrTypeOrDefault('hasSlots', Type, () => false), kernel_1.fromAnnotationOrTypeOrDefault('enhance', Type, () => false), kernel_1.fromAnnotationOrTypeOrDefault('projectionsMap', Type, () => new Map()), kernel_1.mergeArrays(watch_js_1.Watch.getAnnotation(Type), Type.watches));
            }
            // This is the typical default behavior, e.g. from regular CustomElement.define invocations or from @customElement deco
            // The ViewValueConverter also uses this signature and passes in a definition where everything except for the 'hooks'
            // property needs to be copied. So we have that exception for 'hooks', but we may need to revisit that default behavior
            // if this turns out to be too opinionated.
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const name = kernel_1.fromDefinitionOrDefault('name', nameOrDef, exports.CustomElement.generateName);
            return new CustomElementDefinition(Type, name, kernel_1.mergeArrays(exports.CustomElement.getAnnotation(Type, 'aliases'), nameOrDef.aliases, Type.aliases), exports.CustomElement.keyFrom(name), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('cache', nameOrDef, Type, () => 0), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('template', nameOrDef, Type, () => null), kernel_1.mergeArrays(exports.CustomElement.getAnnotation(Type, 'instructions'), nameOrDef.instructions, Type.instructions), kernel_1.mergeArrays(exports.CustomElement.getAnnotation(Type, 'dependencies'), nameOrDef.dependencies, Type.dependencies), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('injectable', nameOrDef, Type, () => null), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('needsCompile', nameOrDef, Type, () => true), kernel_1.mergeArrays(exports.CustomElement.getAnnotation(Type, 'surrogates'), nameOrDef.surrogates, Type.surrogates), bindable_js_1.Bindable.from(...bindable_js_1.Bindable.getAll(Type), exports.CustomElement.getAnnotation(Type, 'bindables'), Type.bindables, nameOrDef.bindables), children_js_1.Children.from(...children_js_1.Children.getAll(Type), exports.CustomElement.getAnnotation(Type, 'childrenObservers'), Type.childrenObservers, nameOrDef.childrenObservers), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('containerless', nameOrDef, Type, () => false), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('isStrictBinding', nameOrDef, Type, () => false), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('shadowOptions', nameOrDef, Type, () => null), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('hasSlots', nameOrDef, Type, () => false), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('enhance', nameOrDef, Type, () => false), kernel_1.fromAnnotationOrDefinitionOrTypeOrDefault('projectionsMap', nameOrDef, Type, () => new Map()), kernel_1.mergeArrays(nameOrDef.watches, watch_js_1.Watch.getAnnotation(Type), Type.watches));
        }
        static getOrCreate(partialDefinition) {
            if (partialDefinition instanceof CustomElementDefinition) {
                return partialDefinition;
            }
            if (definitionLookup.has(partialDefinition)) {
                return definitionLookup.get(partialDefinition);
            }
            const definition = CustomElementDefinition.create(partialDefinition);
            definitionLookup.set(partialDefinition, definition);
            // Make sure the full definition can be retrieved from dynamically created classes as well
            kernel_1.Metadata.define(exports.CustomElement.name, definition, definition.Type);
            return definition;
        }
        register(container) {
            const { Type, key, aliases } = this;
            kernel_1.Registration.transient(key, Type).register(container);
            kernel_1.Registration.aliasTo(key, Type).register(container);
            runtime_1.registerAliases(aliases, exports.CustomElement, key, container);
        }
    }
    exports.CustomElementDefinition = CustomElementDefinition;
    const defaultForOpts = {
        name: undefined,
        searchParents: false,
        optional: false,
    };
    exports.CustomElement = {
        name: kernel_1.Protocol.resource.keyFor('custom-element'),
        keyFrom(name) {
            return `${exports.CustomElement.name}:${name}`;
        },
        isType(value) {
            return typeof value === 'function' && kernel_1.Metadata.hasOwn(exports.CustomElement.name, value);
        },
        for(node, opts = defaultForOpts) {
            if (opts.name === void 0 && opts.searchParents !== true) {
                const controller = kernel_1.Metadata.getOwn(exports.CustomElement.name, node);
                if (controller === void 0) {
                    if (opts.optional === true) {
                        return null;
                    }
                    throw new Error(`The provided node is not a custom element or containerless host.`);
                }
                return controller;
            }
            if (opts.name !== void 0) {
                if (opts.searchParents !== true) {
                    const controller = kernel_1.Metadata.getOwn(exports.CustomElement.name, node);
                    if (controller === void 0) {
                        throw new Error(`The provided node is not a custom element or containerless host.`);
                    }
                    if (controller.is(opts.name)) {
                        return controller;
                    }
                    return (void 0);
                }
                let cur = node;
                let foundAController = false;
                while (cur !== null) {
                    const controller = kernel_1.Metadata.getOwn(exports.CustomElement.name, cur);
                    if (controller !== void 0) {
                        foundAController = true;
                        if (controller.is(opts.name)) {
                            return controller;
                        }
                    }
                    cur = dom_js_1.getEffectiveParentNode(cur);
                }
                if (foundAController) {
                    return (void 0);
                }
                throw new Error(`The provided node does does not appear to be part of an Aurelia app DOM tree, or it was added to the DOM in a way that Aurelia cannot properly resolve its position in the component tree.`);
            }
            let cur = node;
            while (cur !== null) {
                const controller = kernel_1.Metadata.getOwn(exports.CustomElement.name, cur);
                if (controller !== void 0) {
                    return controller;
                }
                cur = dom_js_1.getEffectiveParentNode(cur);
            }
            throw new Error(`The provided node does does not appear to be part of an Aurelia app DOM tree, or it was added to the DOM in a way that Aurelia cannot properly resolve its position in the component tree.`);
        },
        define(nameOrDef, Type) {
            const definition = CustomElementDefinition.create(nameOrDef, Type);
            kernel_1.Metadata.define(exports.CustomElement.name, definition, definition.Type);
            kernel_1.Metadata.define(exports.CustomElement.name, definition, definition);
            kernel_1.Protocol.resource.appendTo(definition.Type, exports.CustomElement.name);
            return definition.Type;
        },
        getDefinition(Type) {
            const def = kernel_1.Metadata.getOwn(exports.CustomElement.name, Type);
            if (def === void 0) {
                throw new Error(`No definition found for type ${Type.name}`);
            }
            return def;
        },
        annotate(Type, prop, value) {
            kernel_1.Metadata.define(kernel_1.Protocol.annotation.keyFor(prop), value, Type);
        },
        getAnnotation(Type, prop) {
            return kernel_1.Metadata.getOwn(kernel_1.Protocol.annotation.keyFor(prop), Type);
        },
        generateName: (function () {
            let id = 0;
            return function () {
                return `unnamed-${++id}`;
            };
        })(),
        createInjectable() {
            const $injectable = function (target, property, index) {
                const annotationParamtypes = kernel_1.DI.getOrCreateAnnotationParamTypes(target);
                annotationParamtypes[index] = $injectable;
                return target;
            };
            $injectable.register = function (container) {
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                return {
                    resolve(container, requestor) {
                        if (requestor.has($injectable, true)) {
                            return requestor.get($injectable);
                        }
                        else {
                            return null;
                        }
                    },
                };
            };
            return $injectable;
        },
        generateType: (function () {
            const nameDescriptor = {
                value: '',
                writable: false,
                enumerable: false,
                configurable: true,
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const defaultProto = {};
            return function (name, proto = defaultProto) {
                // Anonymous class ensures that minification cannot cause unintended side-effects, and keeps the class
                // looking similarly from the outside (when inspected via debugger, etc).
                const Type = class {
                };
                // Define the name property so that Type.name can be used by end users / plugin authors if they really need to,
                // even when minified.
                nameDescriptor.value = name;
                Reflect.defineProperty(Type, 'name', nameDescriptor);
                // Assign anything from the prototype that was passed in
                if (proto !== defaultProto) {
                    Object.assign(Type.prototype, proto);
                }
                return Type;
            };
        })(),
    };
});
//# sourceMappingURL=custom-element.js.map