import { INode, LifecycleFlags, ICompiledCustomElementController, ICustomElementViewModel, ICustomElementController, IHydratedController, ISyntheticView } from '@aurelia/runtime-html';
import { IContainer } from '@aurelia/kernel';
import { IRouter } from '../router';
import { ViewportScope } from '../viewport-scope';
import { IRoutingController } from './viewport';
export declare const ParentViewportScope: import("@aurelia/runtime-html/dist/resources/custom-element").InjectableToken<any>;
export declare class ViewportScopeCustomElement implements ICustomElementViewModel {
    private readonly router;
    container: IContainer;
    private readonly parent;
    private readonly parentController;
    name: string;
    catches: string;
    collection: boolean;
    source: unknown[] | null;
    viewportScope: ViewportScope | null;
    readonly $controller: ICustomElementController<this>;
    controller: IRoutingController;
    readonly element: Element;
    private isBound;
    constructor(router: IRouter, element: INode, container: IContainer, parent: ViewportScopeCustomElement, parentController: IHydratedController);
    beforeComposeChildren(controller: ICompiledCustomElementController): void;
    afterBind(initiator: IHydratedController, parent: ISyntheticView | ICustomElementController | null, flags: LifecycleFlags): void;
    beforeUnbind(initiator: IHydratedController, parent: ISyntheticView | ICustomElementController | null, flags: LifecycleFlags): void | Promise<void>;
    afterUnbind(initiator: IHydratedController, parent: ISyntheticView | ICustomElementController | null, flags: LifecycleFlags): void | Promise<void>;
    afterUnbound(): void;
    connect(): void;
    disconnect(): void;
    private getAttribute;
    private isCustomElementController;
    private isCustomElementViewModel;
    private getClosestCustomElement;
}
//# sourceMappingURL=viewport-scope.d.ts.map