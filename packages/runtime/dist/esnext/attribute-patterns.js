var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AttrSyntax } from './attribute-parser';
import { attributePattern } from './attribute-pattern';
let DotSeparatedAttributePattern = /** @class */ (() => {
    let DotSeparatedAttributePattern = class DotSeparatedAttributePattern {
        ['PART.PART'](rawName, rawValue, parts) {
            return new AttrSyntax(rawName, rawValue, parts[0], parts[1]);
        }
        ['PART.PART.PART'](rawName, rawValue, parts) {
            return new AttrSyntax(rawName, rawValue, parts[0], parts[2]);
        }
    };
    DotSeparatedAttributePattern = __decorate([
        attributePattern({ pattern: 'PART.PART', symbols: '.' }, { pattern: 'PART.PART.PART', symbols: '.' })
    ], DotSeparatedAttributePattern);
    return DotSeparatedAttributePattern;
})();
export { DotSeparatedAttributePattern };
let RefAttributePattern = /** @class */ (() => {
    let RefAttributePattern = class RefAttributePattern {
        ['ref'](rawName, rawValue, parts) {
            return new AttrSyntax(rawName, rawValue, 'element', 'ref');
        }
        ['PART.ref'](rawName, rawValue, parts) {
            return new AttrSyntax(rawName, rawValue, parts[0], 'ref');
        }
    };
    RefAttributePattern = __decorate([
        attributePattern({ pattern: 'ref', symbols: '' }, { pattern: 'PART.ref', symbols: '.' })
    ], RefAttributePattern);
    return RefAttributePattern;
})();
export { RefAttributePattern };
let ColonPrefixedBindAttributePattern = /** @class */ (() => {
    let ColonPrefixedBindAttributePattern = class ColonPrefixedBindAttributePattern {
        [':PART'](rawName, rawValue, parts) {
            return new AttrSyntax(rawName, rawValue, parts[0], 'bind');
        }
    };
    ColonPrefixedBindAttributePattern = __decorate([
        attributePattern({ pattern: ':PART', symbols: ':' })
    ], ColonPrefixedBindAttributePattern);
    return ColonPrefixedBindAttributePattern;
})();
export { ColonPrefixedBindAttributePattern };
let AtPrefixedTriggerAttributePattern = /** @class */ (() => {
    let AtPrefixedTriggerAttributePattern = class AtPrefixedTriggerAttributePattern {
        ['@PART'](rawName, rawValue, parts) {
            return new AttrSyntax(rawName, rawValue, parts[0], 'trigger');
        }
    };
    AtPrefixedTriggerAttributePattern = __decorate([
        attributePattern({ pattern: '@PART', symbols: '@' })
    ], AtPrefixedTriggerAttributePattern);
    return AtPrefixedTriggerAttributePattern;
})();
export { AtPrefixedTriggerAttributePattern };
//# sourceMappingURL=attribute-patterns.js.map