import type { IIndexable, IServiceLocator } from '@aurelia/kernel';
import type { Scope } from './observation/binding-context.js';
import type { CollectionLengthObserver, CollectionSizeObserver } from './observation/collection-length-observer.js';
export interface IBinding {
    interceptor: this;
    readonly locator: IServiceLocator;
    readonly $scope?: Scope;
    readonly $hostScope: Scope | null;
    readonly isBound: boolean;
    $bind(flags: LifecycleFlags, scope: Scope, hostScope: Scope | null): void;
    $unbind(flags: LifecycleFlags): void;
}
export declare type InterceptorFunc<TInput = unknown, TOutput = unknown> = (value: TInput) => TOutput;
export interface ILifecycle extends Lifecycle {
}
export declare const ILifecycle: import("@aurelia/kernel").InterfaceSymbol<ILifecycle>;
export declare class Lifecycle {
    readonly batch: IAutoProcessingQueue<IBatchable>;
}
export interface IProcessingQueue<T> {
    add(requestor: T): void;
    process(flags: LifecycleFlags): void;
}
export interface IAutoProcessingQueue<T> extends IProcessingQueue<T> {
    readonly depth: number;
    begin(): void;
    end(flags?: LifecycleFlags): void;
    inline(fn: () => void, flags?: LifecycleFlags): void;
}
export declare class BatchQueue implements IAutoProcessingQueue<IBatchable> {
    readonly lifecycle: ILifecycle;
    queue: IBatchable[];
    depth: number;
    constructor(lifecycle: ILifecycle);
    begin(): void;
    end(flags?: LifecycleFlags): void;
    inline(fn: () => void, flags?: LifecycleFlags): void;
    add(requestor: IBatchable): void;
    remove(requestor: IBatchable): void;
    process(flags: LifecycleFlags): void;
}
export declare enum BindingMode {
    oneTime = 1,
    toView = 2,
    fromView = 4,
    twoWay = 6,
    default = 8
}
export declare const enum LifecycleFlags {
    none = 0,
    persistentBindingFlags = 15367,
    allowParentScopeTraversal = 1024,
    observeLeafPropertiesOnly = 2048,
    targetObserverFlags = 12295,
    noFlush = 4096,
    persistentTargetObserverQueue = 8192,
    bindingStrategy = 7,
    getterSetterStrategy = 1,
    proxyStrategy = 2,
    isStrictBindingStrategy = 4,
    update = 24,
    updateTarget = 8,
    updateSource = 16,
    from = 96,
    fromBind = 32,
    fromUnbind = 64,
    mustEvaluate = 128,
    isTraversingParentScope = 256,
    dispose = 512
}
export interface IConnectable {
    id: number;
    observeProperty(obj: object, propertyName: PropertyKey): void;
    observeCollection(obj: Collection): void;
}
export declare enum DelegationStrategy {
    none = 0,
    capturing = 1,
    bubbling = 2
}
export interface IBatchable {
    flushBatch(flags: LifecycleFlags): void;
}
export interface ISubscriber<TValue = unknown> {
    id?: number;
    handleChange(newValue: TValue, previousValue: TValue, flags: LifecycleFlags): void;
}
export interface ICollectionSubscriber {
    handleCollectionChange(indexMap: IndexMap, flags: LifecycleFlags): void;
}
export interface ISubscribable {
    subscribe(subscriber: ISubscriber | ICollectionSubscriber): void;
    unsubscribe(subscriber: ISubscriber | ICollectionSubscriber): void;
}
export interface ICollectionSubscribable {
    subscribeToCollection(subscriber: ICollectionSubscriber): void;
    unsubscribeFromCollection(subscriber: ICollectionSubscriber): void;
}
export interface ISubscriberRecord<T extends ISubscriber | ICollectionSubscriber = ISubscriber | ICollectionSubscriber> {
    readonly count: number;
    add(subscriber: T): boolean;
    has(subscriber: T): boolean;
    remove(subscriber: T): boolean;
    any(): boolean;
    notify(value: unknown, oldValue: unknown, flags: LifecycleFlags): void;
    notifyCollection(indexMap: IndexMap, flags: LifecycleFlags): void;
}
export interface ISubscriberCollection extends ISubscribable {
    [key: number]: LifecycleFlags;
    /**
     * The backing subscriber record for all subscriber methods of this collection
     */
    readonly subs: ISubscriberRecord;
    callSubscribers(newValue: unknown, oldValue: unknown, flags: LifecycleFlags): void;
    hasSubscribers(): boolean;
    hasSubscriber(subscriber: ISubscriber): boolean;
    removeSubscriber(subscriber: ISubscriber): boolean;
    addSubscriber(subscriber: ISubscriber): boolean;
}
export interface ICollectionSubscriberCollection extends ICollectionSubscribable, ISubscribable {
    [key: number]: LifecycleFlags;
    /**
     * The backing subscriber record for all subscriber methods of this collection
     */
    readonly subs: ISubscriberRecord;
    callCollectionSubscribers(indexMap: IndexMap, flags: LifecycleFlags): void;
    hasCollectionSubscribers(): boolean;
    hasCollectionSubscriber(subscriber: ICollectionSubscriber): boolean;
    removeCollectionSubscriber(subscriber: ICollectionSubscriber): boolean;
    addCollectionSubscriber(subscriber: ICollectionSubscriber): boolean;
}
/**
 * A collection (array, set or map)
 */
export declare type Collection = unknown[] | Set<unknown> | Map<unknown, unknown>;
export declare const enum CollectionKind {
    indexed = 8,
    keyed = 4,
    array = 9,
    map = 6,
    set = 7
}
export declare type LengthPropertyName<T> = T extends unknown[] ? 'length' : T extends Set<unknown> ? 'size' : T extends Map<unknown, unknown> ? 'size' : never;
export declare type CollectionTypeToKind<T> = T extends unknown[] ? CollectionKind.array | CollectionKind.indexed : T extends Set<unknown> ? CollectionKind.set | CollectionKind.keyed : T extends Map<unknown, unknown> ? CollectionKind.map | CollectionKind.keyed : never;
export declare type CollectionKindToType<T> = T extends CollectionKind.array ? unknown[] : T extends CollectionKind.indexed ? unknown[] : T extends CollectionKind.map ? Map<unknown, unknown> : T extends CollectionKind.set ? Set<unknown> : T extends CollectionKind.keyed ? Set<unknown> | Map<unknown, unknown> : never;
export declare type ObservedCollectionKindToType<T> = T extends CollectionKind.array ? unknown[] : T extends CollectionKind.indexed ? unknown[] : T extends CollectionKind.map ? Map<unknown, unknown> : T extends CollectionKind.set ? Set<unknown> : T extends CollectionKind.keyed ? Map<unknown, unknown> | Set<unknown> : never;
export declare const enum AccessorType {
    None = 0,
    Observer = 1,
    Node = 2,
    Obj = 4,
    Layout = 8,
    Array = 18,
    Set = 34,
    Map = 66
}
/**
 * Basic interface to normalize getting/setting a value of any property on any object
 */
export interface IAccessor<TValue = unknown> {
    type: AccessorType;
    getValue(obj?: object, key?: PropertyKey): TValue;
    setValue(newValue: TValue, flags: LifecycleFlags, obj?: object, key?: PropertyKey): void;
}
export interface IObserver extends IAccessor, ISubscribable {
    [id: number]: number;
}
export declare type AccessorOrObserver = (IAccessor | IObserver) & {
    doNotCache?: boolean;
} & {
    [id: number]: number;
};
/**
 * An array of indices, where the index of an element represents the index to map FROM, and the numeric value of the element itself represents the index to map TO
 *
 * The deletedItems property contains the items (in case of an array) or keys (in case of map or set) that have been deleted.
 */
export declare type IndexMap = number[] & {
    deletedItems: number[];
    isIndexMap: true;
};
export declare function copyIndexMap(existing: number[] & {
    deletedItems?: number[];
}, deletedItems?: number[]): IndexMap;
export declare function createIndexMap(length?: number): IndexMap;
export declare function cloneIndexMap(indexMap: IndexMap): IndexMap;
export declare function isIndexMap(value: unknown): value is IndexMap;
export interface IArrayIndexObserver extends IObserver {
    owner: ICollectionObserver<CollectionKind.array>;
}
/**
 * Describes a type that specifically tracks changes in a collection (map, set or array)
 */
export interface ICollectionChangeTracker<T extends Collection> {
    collection: T;
    indexMap: IndexMap;
}
/**
 * An observer that tracks collection mutations and notifies subscribers (either directly or in batches)
 */
export interface ICollectionObserver<T extends CollectionKind> extends ICollectionChangeTracker<CollectionKindToType<T>>, ICollectionSubscriberCollection, IBatchable {
    type: AccessorType;
    inBatch: boolean;
    lifecycle?: ILifecycle;
    collection: ObservedCollectionKindToType<T>;
    lengthObserver: T extends CollectionKind.array ? CollectionLengthObserver : CollectionSizeObserver;
    getLengthObserver(): T extends CollectionKind.array ? CollectionLengthObserver : CollectionSizeObserver;
    notify(): void;
}
export declare type CollectionObserver = ICollectionObserver<CollectionKind>;
export interface IBindingContext {
    [key: string]: any;
}
export interface IOverrideContext {
    [key: string]: unknown;
    readonly bindingContext: IBindingContext;
}
export declare type IObservable<T = IIndexable> = T & {
    $observers?: IIndexable<{}, AccessorOrObserver>;
};
//# sourceMappingURL=observation.d.ts.map