import { IViewportScopeOptions, ViewportScope } from './viewport-scope';
import { RouteRecognizer, RouteHandler, ConfigurableRoute, RecognizeResult } from './route-recognizer';
import { IContainer } from '@aurelia/kernel';
import { CustomElementType } from '@aurelia/runtime';
import { IRoute, ComponentAppellation, INavigatorInstruction } from './interfaces';
import { FoundRoute } from './found-route';
import { IRouter } from './router';
import { ViewportInstruction } from './viewport-instruction';
import { NavigationInstructionResolver } from './type-resolvers';
import { Viewport, IViewportOptions } from './viewport';

export interface IFindViewportsResult {
  foundViewports: ViewportInstruction[];
  remainingInstructions: ViewportInstruction[];
}

export interface IScopeOwner {
  connectedScope: Scope;
  scope: Scope;
  owningScope: Scope;
  enabled: boolean;
  path: string | null;

  isViewport: boolean;
  isViewportScope: boolean;

  setNextContent(content: ComponentAppellation | ViewportInstruction, instruction: INavigatorInstruction): boolean;
  canLeave(): Promise<boolean>;
  getRoutes(): IRoute[] | null;
}

export class Scope {
  public id: string = '.';
  public scope: Scope;

  public parent: Scope | null = null;
  public children: Scope[] = [];
  public replacedChildren: Scope[] = [];
  public path: string | null = null;

  public enabled: boolean = true;

  public constructor(
    public readonly router: IRouter,
    public readonly hasScope: boolean,
    public owningScope: Scope | null,
    public viewport: Viewport | null = null,
    public viewportScope: ViewportScope | null = null,
    public rootComponentType: CustomElementType | null = null, // temporary. Metadata will probably eliminate it
  ) {
    this.owningScope = owningScope || this;
    this.scope = this.hasScope ? this : this.owningScope;
  }

  public get isViewport(): boolean {
    return this.viewport !== null;
  }
  public get isViewportScope(): boolean {
    return this.viewportScope !== null;
  }
  public get passThroughScope(): boolean {
    return this.isViewportScope && this.viewportScope!.passThroughScope;
  }

  public get owner(): IScopeOwner | null {
    if (this.isViewport) {
      return this.viewport;
    }
    if (this.isViewportScope) {
      return this.viewportScope;
    }
    return null;
  }
  public get enabledChildren(): Scope[] {
    return this.children.filter(scope => scope.enabled);
  }
  public get hoistedChildren(): Scope[] {
    let scopes: Scope[] = this.enabledChildren;
    while (scopes.some(scope => scope.passThroughScope)) {
      for (const scope of scopes.slice()) {
        if (scope.passThroughScope) {
          const index: number = scopes.indexOf(scope);
          scopes.splice(index, 1, ...scope.enabledChildren);
        }
      }
    }
    return scopes;
  }

  public get enabledViewports(): Viewport[] {
    return this.children.filter(scope => scope.isViewport && scope.enabled)
      .map(scope => scope.viewport) as Viewport[];
  }

  public get viewportInstruction(): ViewportInstruction | null {
    if (this.isViewportScope) {
      return this.viewportScope!.content;
    }
    if (this.isViewport) {
      return this.viewport!.content!.content;
    }
    return null;
  }

  public getEnabledViewports(viewportScopes: Scope[]): Record<string, Viewport> {
    return viewportScopes.filter(scope => !scope.isViewportScope).map(scope => scope.viewport).reduce(
      (viewports: Record<string, Viewport>, viewport) => {
        viewports[viewport!.name] = viewport!;
        return viewports;
      },
      {});
    // return this.getOwnedViewports().filter(viewport => viewport.enabled).reduce(
    //   (viewports: Record<string, Viewport>, viewport) => {
    //     viewports[viewport.name] = viewport;
    //     return viewports;
    //   },
    //   {});
  }

  public getOwnedViewports(includeDisabled: boolean = false): Viewport[] {
    return this.allViewports(includeDisabled).filter(viewport => viewport.owningScope === this);
  }

  public getOwnedScopes(includeDisabled: boolean = false): Scope[] {
    const scopes: Scope[] = this.allScopes(includeDisabled).filter(scope => scope.owningScope === this);
    // Hoist children to pass through scopes
    for (const scope of scopes.slice()) {
      if (scope.passThroughScope) {
        const index: number = scopes.indexOf(scope);
        scopes.splice(index, 1, ...scope.getOwnedScopes());
      }
    }
    return scopes;
  }

  public findViewports(instructions: ViewportInstruction[], alreadyFound: ViewportInstruction[], disregardViewports: boolean = false): IFindViewportsResult {
    const foundViewports: ViewportInstruction[] = [];
    let remainingInstructions: ViewportInstruction[] = [];

    // // This is a "manual" viewport scope
    // if (skipManual && this.viewport === null) {
    //   for (const child of this.enabledChildren) {
    //     console.log(child.scope === this, this, child.scope);
    //     const childFound: IFindViewportsResult = child.findViewports(instructions, alreadyFound, disregardViewports, true);
    //     foundViewports.push(...childFound.foundViewports);
    //     alreadyFound.push(...childFound.foundViewports);
    //     remainingInstructions.push(...childFound.remainingInstructions);
    //   }
    //   return {
    //     foundViewports,
    //     remainingInstructions,
    //   };
    // }

    const ownedScopes: Scope[] = this.getOwnedScopes();
    // Get a shallow copy of all available manual viewport scopes
    const viewportScopes: Scope[] = ownedScopes.filter(scope => scope.isViewportScope);
    for (const scope of viewportScopes) {
      scope.viewportScope!.available = alreadyFound.every(found => found.viewportScope !== scope.viewportScope);
    }
    // Get a shallow copy of all available viewports
    const availableViewports: Record<string, Viewport | null> = { ...this.getEnabledViewports(ownedScopes) };
    for (const instruction of alreadyFound.filter(found => found.scope === this)) {
      availableViewports[instruction.viewportName!] = null;
    }

    const viewportInstructions = instructions.slice();

    // The viewport is already known
    if (!disregardViewports) {
      for (let i = 0; i < viewportInstructions.length; i++) {
        const instruction = viewportInstructions[i];
        if (instruction.viewport) {
          const remaining = this.foundViewport(instruction, instruction.viewport, disregardViewports);
          foundViewports.push(instruction);
          remainingInstructions.push(...remaining);
          availableViewports[instruction.viewport.name] = null;
          viewportInstructions.splice(i--, 1);
        }
      }
    }

    // Manual viewport scopes have priority
    for (let i = 0; i < viewportInstructions.length; i++) {
      const instruction: ViewportInstruction = viewportInstructions[i];
      for (let scope of viewportScopes) {
        if (scope.viewportScope!.acceptSegment(instruction.componentName as string)) {
          const viewportScope: ViewportScope = scope.viewportScope as ViewportScope;
          // const available: boolean = true;
          if (Array.isArray(viewportScope.options.source)) {
            const source: unknown[] = viewportScope.options.source;
            // console.log('available', viewportScope.available, source);
            const availableIndex: number = viewportScopes
              .map(scope => scope.viewportScope!)
              .findIndex(find => find.name === viewportScope.name && find.available);
            if (availableIndex >= 0) {
              scope = viewportScopes[availableIndex];
            } else {
              source.push((source[0] as any).create());
              instruction.viewportScope = null;
              // available = false;
              break;
            }
          }
          // TODO: Move to setNextContent?
          scope.viewportScope!.available = false;
          instruction.needsViewportDescribed = false;
          instruction.viewportScope = scope.viewportScope;
          const remaining: ViewportInstruction[] = (instruction.nextScopeInstructions || []).slice();
          for (const rem of remaining) {
            if (rem.scope === null) {
              rem.scope = scope.scope;
            }
          }
          foundViewports.push(instruction);
          remainingInstructions.push(...remaining);
          // TODO: Tick this viewport scope of
          // availableViewports[name] = null;
          viewportInstructions.splice(i--, 1);
          break;
        }
      }
    }

    // Configured viewport is ruling
    for (let i = 0; i < viewportInstructions.length; i++) {
      const instruction = viewportInstructions[i];
      instruction.needsViewportDescribed = true;
      for (const name in availableViewports) {
        if (Object.prototype.hasOwnProperty.call(availableViewports, name)) {
          const viewport: Viewport | null = availableViewports[name];
          // TODO: Also check if (resolved) component wants a specific viewport
          if (viewport && viewport.wantComponent(instruction.componentName as string)) {
            const remaining = this.foundViewport(instruction, viewport, disregardViewports, true);
            foundViewports.push(instruction);
            remainingInstructions.push(...remaining);
            availableViewports[name] = null;
            viewportInstructions.splice(i--, 1);
            break;
          }
        }
      }
    }

    // Next in line is specified viewport (but not if we're disregarding viewports)
    if (!disregardViewports) {
      for (let i = 0; i < viewportInstructions.length; i++) {
        const instruction = viewportInstructions[i];
        const name = instruction.viewportName as string;
        if (!name || !name.length) {
          continue;
        }
        const newScope = instruction.ownsScope;
        if (!this.getEnabledViewports(ownedScopes)[name]) {
          continue;
          // TODO: No longer pre-creating viewports. Evaluate!
          this.addViewport(name, null, null, { scope: newScope, forceDescription: true });
          availableViewports[name] = this.getEnabledViewports(ownedScopes)[name];
        }
        const viewport = availableViewports[name];
        if (viewport && viewport.acceptComponent(instruction.componentName as string)) {
          const remaining = this.foundViewport(instruction, viewport, disregardViewports, true);
          foundViewports.push(instruction);
          remainingInstructions.push(...remaining);
          availableViewports[name] = null;
          viewportInstructions.splice(i--, 1);
        }
      }
    }

    // Finally, only one accepting viewport left?
    for (let i = 0; i < viewportInstructions.length; i++) {
      const instruction = viewportInstructions[i];
      const remainingViewports: Viewport[] = [];
      for (const name in availableViewports) {
        if (Object.prototype.hasOwnProperty.call(availableViewports, name)) {
          const viewport: Viewport | null = availableViewports[name];
          if (viewport && viewport.acceptComponent(instruction.componentName as string)) {
            remainingViewports.push(viewport);
          }
        }
      }
      if (remainingViewports.length === 1) {
        const viewport: Viewport = remainingViewports.shift() as Viewport;
        const remaining = this.foundViewport(instruction, viewport, disregardViewports, true);
        foundViewports.push(instruction);
        remainingInstructions.push(...remaining);
        availableViewports[viewport.name] = null;
        viewportInstructions.splice(i--, 1);
      }
    }

    // If we're ignoring viewports, we now match them anyway
    if (disregardViewports) {
      for (let i = 0; i < viewportInstructions.length; i++) {
        const instruction = viewportInstructions[i];
        let viewport = instruction.viewport;
        if (!viewport) {
          const name = instruction.viewportName as string;
          if (!name || !name.length) {
            continue;
          }
          const newScope = instruction.ownsScope;
          if (!this.getEnabledViewports(ownedScopes)[name]) {
            continue;
            // TODO: No longer pre-creating viewports. Evaluate!
            this.addViewport(name, null, null, { scope: newScope, forceDescription: true });
            availableViewports[name] = this.getEnabledViewports(ownedScopes)[name];
          }
          viewport = availableViewports[name];
        }
        if (viewport && viewport.acceptComponent(instruction.componentName as string)) {
          const remaining = this.foundViewport(instruction, viewport, disregardViewports);
          foundViewports.push(instruction);
          remainingInstructions.push(...remaining);
          availableViewports[viewport.name] = null;
          viewportInstructions.splice(i--, 1);
        }
      }
    }

    remainingInstructions = [...viewportInstructions, ...remainingInstructions];
    return {
      foundViewports,
      remainingInstructions,
    };
  }

  public foundViewport(instruction: ViewportInstruction, viewport: Viewport, withoutViewports: boolean, doesntNeedViewportDescribed: boolean = false): ViewportInstruction[] {
    instruction.setViewport(viewport);
    if (doesntNeedViewportDescribed) {
      instruction.needsViewportDescribed = false;
    }
    const remaining: ViewportInstruction[] = (instruction.nextScopeInstructions || []).slice();
    for (const rem of remaining) {
      if (rem.scope === null) {
        rem.scope = viewport.scope;
      }
    }
    return remaining;
  }

  public addViewport(name: string, element: Element | null, container: IContainer | null, options: IViewportOptions = {}): Viewport {
    let viewport: Viewport | null = this.getEnabledViewports(this.getOwnedScopes())[name];
    // Each au-viewport element has its own Viewport
    if (element && viewport && viewport.element !== null && viewport.element !== element) {
      viewport.enabled = false;
      viewport = this.getOwnedViewports(true).find(child => child.name === name && child.element === element) || null;
      if (viewport) {
        viewport.enabled = true;
      }
    }
    if (!viewport) {
      viewport = new Viewport(this.router, name, null, null, this.scope, !!options.scope, options);
      this.addChild(viewport.connectedScope);
    }
    // TODO: Either explain why || instead of && here (might only need one) or change it to && if that should turn out to not be relevant
    if (element || container) {
      viewport.setElement(element as Element, container as IContainer, options);
    }
    return viewport;
  }
  public removeViewport(viewport: Viewport, element: Element | null, container: IContainer | null): boolean {
    if ((!element && !container) || viewport.remove(element, container)) {
      this.removeChild(viewport.connectedScope);
      return true;
    }
    return false;
  }
  public addViewportScope(name: string, element: Element | null, options: IViewportScopeOptions = {}): ViewportScope {
    const viewportScope: ViewportScope = new ViewportScope(name, this.router, element, this.scope, true, null, options);
    this.addChild(viewportScope.connectedScope);
    return viewportScope;
  }
  public removeViewportScope(viewportScope: ViewportScope): boolean {
    // viewportScope.remove();
    this.removeChild(viewportScope.connectedScope);
    return true;
  }

  public addChild(scope: Scope): void {
    if (!this.children.some(vp => vp === scope)) {
      if (scope.parent !== null) {
        scope.parent.removeChild(scope);
      }
      this.children.push(scope);
      scope.parent = this;
    }
  }
  public removeChild(scope: Scope): void {
    const index: number = this.children.indexOf(scope);
    if (index >= 0) {
      this.children.splice(index, 1);
      scope.parent = null;
    }
  }
  // public reparent(viewModel: IViewModel): void {
  //   const container = this.getContainer(viewModel);
  //   const id = container!.path.split('.').map(i => '00000'.slice(0, 5 - ('' + i).length) + i).join('.');
  //   this.id = `${id}.`;

  //   const scope: Scope = this.router.rootScope!.connectedScope;

  //   let parent = this.parent as Scope;
  //   let parentIds = parent.children.filter(child => child !== this && child.id.indexOf(this.id));
  //   while (Array.isArray(parentIds) && parentIds.length > 0) {
  //     parent = parentIds[0];
  //     parentIds = parent.children.filter(child => child !== this && child.id.indexOf(this.id));
  //   }
  //   parent.addChild(this);
  //   const children: Scope[] = parent.children.filter(child => child !== this);
  //   for (const child of children) {
  //     if (child.id.indexOf(this.id) >= 0) {
  //       this.addChild(child);
  //     }
  //   }
  //   scope.reparentScope();
  // }
  // public reparentScope(): void {
  //   if (this.parent !== null) {
  //     this.owningScope = this.parent.scope;
  //     this.scope = this.hasScope ? this : this.owningScope;
  //   }
  //   for (const child of this.children) {
  //     child.reparentScope();
  //   }
  // }

  public clearReplacedChildren(): void {
    this.replacedChildren = [];
  }
  public disableReplacedChildren(): void {
    this.replacedChildren = this.enabledChildren;
    for (const scope of this.replacedChildren) {
      scope.enabled = false;
    }
  }
  public reenableReplacedChildren(): void {
    for (const scope of this.replacedChildren) {
      scope.enabled = true;
    }
  }

  public allViewports(includeDisabled: boolean = false, includeReplaced: boolean = false): Viewport[] {
    return this.allScopes(includeDisabled, includeReplaced).filter(scope => scope.isViewport).map(scope => scope.viewport!);
    // const scopes: Scope[] = includeDisabled ? this.children : this.enabledChildren;
    // const viewports: Viewport[] = scopes.filter(scope => scope.isViewport).map(scope => scope.viewport!);
    // for (const scope of scopes) {
    //   viewports.push(...scope.allViewports(includeDisabled, includeReplaced));
    // }
    // return viewports;
  }

  public allScopes(includeDisabled: boolean = false, includeReplaced: boolean = false): Scope[] {
    const scopes: Scope[] = includeDisabled ? this.children.slice() : this.enabledChildren;
    for (const scope of scopes.slice()) {
      scopes.push(...scope.allScopes(includeDisabled, includeReplaced));
    }
    return scopes;
  }

  public reparentViewportInstructions(): ViewportInstruction[] | null {
    const scopes: Scope[] = this.hoistedChildren
      .filter(scope => scope.viewportInstruction !== null && scope.viewportInstruction.componentName);
    if (!scopes.length) {
      return null;
    }
    for (const scope of scopes) {
      const childInstructions: ViewportInstruction[] | null = scope.reparentViewportInstructions();
      scope.viewportInstruction!.nextScopeInstructions =
        childInstructions !== null && childInstructions.length > 0 ? childInstructions : null;
    }
    return scopes.map(scope => scope.viewportInstruction!);
    // const enabledViewports = this.enabledViewports.filter(viewport => viewport.content.content
    //   && viewport.content.content.componentName);
    // if (!enabledViewports.length) {
    //   return null;
    // }
    // for (const viewport of enabledViewports) {
    //   if (viewport.content.content !== void 0 && viewport.content.content !== null) {
    //     const childInstructions = viewport.viewportScope.reparentViewportInstructions();
    //     viewport.content.content.nextScopeInstructions = childInstructions !== null && childInstructions.length > 0 ? childInstructions : null;
    //   }
    // }
    // return enabledViewports.map(viewport => viewport.content.content);
  }

  public findMatchingRoute(path: string): FoundRoute | null {
    if (this.isViewportScope && !this.passThroughScope) {
      return this.findMatchingRouteInRoutes(path, this.viewportScope!.getRoutes());
    }
    if (this.isViewport) {
      return this.findMatchingRouteInRoutes(path, this.viewport!.getRoutes());
    }

    // TODO: Match specified names here

    for (const child of this.enabledChildren) {
      const found = child.findMatchingRoute(path);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  public async canLeave(): Promise<boolean> {
    const results = await Promise.all(this.children.map(child =>
      child.viewport !== null
        ? child.viewport.canLeave()
        : child.canLeave()));
    return !results.some(result => result === false);
  }

  private findMatchingRouteInRoutes(path: string, routes: IRoute[] | null): FoundRoute | null {
    if (!Array.isArray(routes)) {
      return null;
    }

    routes = routes.map(route => this.ensureProperRoute(route));
    const recognizableRoutes: ConfigurableRoute[] = routes.map(route => ({ path: route.path, handler: { name: route.id, route } }));
    for (let i: number = 0, ilen: number = recognizableRoutes.length; i < ilen; i++) {
      const newRoute: ConfigurableRoute = { ...recognizableRoutes[i] };
      newRoute.path += '/*remainingPath';
      recognizableRoutes.push(newRoute);
    }
    const found: FoundRoute = new FoundRoute();
    let params: Record<string, unknown> = {};
    if (path.startsWith('/') || path.startsWith('+')) {
      path = path.slice(1);
    }
    const recognizer: RouteRecognizer = new RouteRecognizer();
    recognizer.add(recognizableRoutes);
    const result: RecognizeResult[] = recognizer.recognize(path);
    if (result !== void 0 && result.length > 0) {
      found.match = (result[0].handler as RouteHandler & { route: IRoute }).route;
      found.matching = path;
      params = result[0].params;
      if (params.remainingPath !== void 0 && (params.remainingPath as string).length > 0) {
        found.remaining = params.remainingPath as string;
        delete params['remainingPath'];
        found.matching = found.matching.slice(0, found.matching.indexOf(found.remaining));
      }
    }
    if (found.foundConfiguration) {
      // clone it so config doesn't get modified
      found.instructions = this.router.instructionResolver.cloneViewportInstructions(found.match!.instructions as ViewportInstruction[], false, true);
      const instructions: ViewportInstruction[] = found.instructions.slice();
      while (instructions.length > 0) {
        const instruction: ViewportInstruction = instructions.shift() as ViewportInstruction;
        instruction.addParameters(params);
        instruction.route = '';
        if (instruction.nextScopeInstructions !== null) {
          instructions.unshift(...instruction.nextScopeInstructions);
        }
      }
      if (found.instructions.length > 0) {
        found.instructions[0].route = found.matching;
      }
    }
    return found;
  }

  private ensureProperRoute(route: IRoute): IRoute {
    if (route.id === void 0) {
      route.id = route.path;
    }
    route.instructions = NavigationInstructionResolver.toViewportInstructions(this.router, route.instructions);
    return route;
  }

  // private getContainer(viewModel: IViewModel): IContainer | null {
  //   let context;
  //   if ('context' in viewModel) {
  //     context = (viewModel as IViewModel & { context: IRenderContext }).context;
  //   } else {
  //     context = (viewModel as IViewModel & { context: IRenderContext }).context !== void 0
  //       ? (viewModel as IViewModel & { context: IRenderContext }).context
  //       : viewModel.$controller!.context;
  //   }

  //   const container = context!.get(IContainer);
  //   if (container === void 0) {
  //     return null;
  //   }
  //   return container;
  // }
}