---
description: Understand the scope and binding context
---

# Scope and context

You might have noticed these words Scope, binding context, and override context in other places in the documentation.
Although you can go a long way without even understanding what these are (Aurelia is cool that way), these are some (of many) powerful concepts those are essential when you need to deal with the lower level Aurelia2 API.
This section explains what these terms mean.

{% hint style="success" %}
**Here's what you'll learn...**

* What is Scope?
* What are binding context, and override context?
* How a context is selected?

{% endhint %}

## Background

When we start an Aurelia app, the compilation pipeline JIT compiles the templates (HTML/markup) associated with custom elements.
The compilation process in itself demands a documentation of its own, and certainly is out of the scope of this topic.
Without going into much details about that, we can simply think of the compilation process in terms of the following steps:

* parse the template text,
* create instructions for custom elements, custom attributes, and template controllers (`if`, `else`, `repeat.for` etc.), and
* create a set of bindings for every instruction.

Most the bindings also contains expressions.
Following are some examples.

```markup
<!-- interpolation binding -->
${firstName}

<!-- property binding -->
<my-el prop.bind="address.pin"></my-el>
```

In the example above, the interpolation binding has the expression `firsName`, and the property binding has the expression `address.pin` (quite unsurprisingly the things are bit more involved in actuality, but this abstraction will do for now).
An expression in itself might not be that interesting, but when it is executed, it becomes of interest.
Enter scope; to evaluate an expression we need scope.

## Scope and binding context

The expressions themselves do not hold any state or context.
This means that the expression `firstName` only knows that given an object it needs to grab the `firstName` property of that object.
However, the expression in itself, does not hold that object.
Scope is the container that holds the object(s) for the expression.

These objects are known as contexts.
There are typically two types of contexts: binding context, and override context.
An expression can be evaluated against any of these two kinds of contexts.
Even though there are couple of subtle difference between these two kinds of contexts (see [Override context](#override-context)), in terms of expression evaluation there exists no difference between these.

### JavaScript analogy

One way to think about expression and binding context is in terms of functions and binding those functions.
Let us consider the following example.

{% code title="foo.ts" %}
```typescript
function foo() { return this.a ** 2; }
```
{% endcode %}

If we execute this function we will get `NaN`.
However, when we bind any object to it, it might return more meaningful value, depending on the bound object.

{% code title="foo.ts" %}
```typescript
function foo() { return this.a ** 2; }

const obj1 = { a: 10 };
const obj2 = { a: 20 };

console.log(foo.apply(obj1));       // 100
console.log(foo.apply(obj2));       // 400
```
{% endcode %}

Following that analogy, the expressions are like this function, or more precisely like the expression `a ** 2` in the function.
Binding contexts are like the objects used to bind the function.
That is given 2 different binding context, same expression can produce different results, when evaluated.
Scope, as said before, wraps the binding context.
The need to have this wrapper over the binding context is explained in later sections.

### How to access the scope and the binding context?

Aurelia pipeline injects a `$controller` property to every custom element, custom attribute, and template controllers.
This property can be used access the scope, and binding context.
Let us consider the following example.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'app',
  template: '<div>${message}</div>'
})
export class App implements ICustomElementViewModel {
  public readonly message: string = 'Hello World!';
  public readonly $controller: ICustomElementController<this>;

  public created(): void {
    const scope = this.$controller.scope;
    const bindingContext = scope.bindingContext;
    console.log(Object.is(bindingContext, this)); // true
    console.log(bindingContext.message);          // Hello World!
  }
}
```
{% endcode %}

Note that we haven't assigned any value explicitly to the `$controller` property; and that is assigned by the Aurelia pipeline.
We can use the `$controller.scope` to access the scope, and subsequently `$controller.scope.bindingContext` can be used to access the binding context.
Note how the `bindingContext` in the above example points to `this`, that is the current instance of `App` (with template controllers, this gets little bit more involved; but we will leave that one out for now).
However, in the context of evaluating expressions, we refer the source of data as a "context".

The relations explored so far can be expressed as follows.

```text
+-----------------------+
|                       |
|  Scope                |
|                       |
|  +----------------+   |
|  |                |   |
|  | bindingContext |   |
|  |                |   |
|  +----------------+   |
|                       |
+-----------------------+

```

From here let us proceed to understand what override context is.

## Override context

As the name suggests, it is also a context, that overrides the binding context.
In other words, Aurelia prioritize the override context when the desired property is found there.
Continuing with the [previous example](#how-to-access-the-scope-and-the-binding-context), it renders `<div>Hello World!</div>`.
However, things might be bit different if we toy with the override context, as shown in the following example.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'app',
  template: '<div>${message}</div>'
})
export class App implements ICustomElementViewModel {
  public readonly message: string = 'Hello World!';
  public readonly $controller: ICustomElementController<this>;

  public created(): void {
    const scope = this.$controller.scope;
    scope.overrideContext.message = 'Hello Aurelia!';
  }
}
```
{% endcode %}

With the assignment to `overrideContext.message` the rendered output is now `<div>Hello Aurelia!</div>` instead of `<div>Hello World!</div>`.
This is because of the existence of the property `message` in the override context.
Context [selection process](#context-selection) sees that there the required property exists in the override context, and prioritize that even though a property with the same name exists on the binding context as well.

Now with this information we also have a new diagram.

```text
+-----------------------+
|                       |
|  Scope                |
|                       |
|  +----------------+   |
|  |                |   |
|  | bindingContext |   |
|  |                |   |
|  +----------------+   |
|                       |
|                       |
|  +-----------------+  |
|  |                 |  |
|  | overrideContext |  |
|  |                 |  |
|  +-----------------+  |
|                       |
+-----------------------+
```

### Motivation

If you are thinking 'Why do we need override context at all?', let me tell you that it is a great question.
The reason it exists has to do with the template controllers.
While writing template controllers, many times we want a context object that is not the underlying view-model instance.
One such prominent example is the [`repeat.for`](../getting-started/rendering-collections.md) template controller.
As you might know that `repeat.for` template controller provides contextual properties such as `$index`, `$first`, `$last` etc.
These properties end up being in the override context.

Now imagine if those properties actually end up being in the binding context, which is often the underlying view-model instance, it would have caused a lot of other issues.
First of all, that would have restricted you having properties with the same name to avoid conflicts.
Which in turn means that you need to know the template controllers you are using thoroughly, to know about such restrictions, which is not a sound idea in itself.
And with that if you define a property with the same name, as used by the template controller, coupled with change observation etc., we could have found ourselves dealing with numerous bugs in the process.
Override context helps us to get out of that horrific mess.

Another prominent use-case for override context is the `let` binding.
When not specified otherwise, the properties bound via the `let` binding ends up in the override context.
This can be seen in the example below.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'app',
  template: '<let foo.bind="42"></let>${foo}'
})
export class App implements ICustomElementViewModel {
  public readonly $controller: ICustomElementController<this>;

  public attached(): void {
    const scope = this.$controller.scope;
    console.log('foo' in scope.bindingContext);  // false
    console.log(scope.overrideContext.foo);      // 42
  }
}
```
{% endcode %}

As typically the properties for the `let`-bindings are view-only properties, it makes sense to have those properties in the override context.

{% hint style="info" %}
Do you know that you can use `to-binding-context` attribute in `let`-binding to target the binding context instead of override context?
Why don't you try `<let foo.bind="42" to-binding-context></let>` and inspect the scope contexts by yourself?
{% endhint %}

### Connection between binding context and override context

Ideally, even with the presence of override context, we do want to use the properties (not the same one of course) defined in the binding context.
For that reason, every instance of override context also has a property named `bindingContext` that points to the binding context.
This is shown in the example below.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'app',
  template: '<div>${message}</div>'
})
export class App implements ICustomElementViewModel {
  public readonly message: string = 'Hello World!';
  public readonly $controller: ICustomElementController<this>;

  public created(): void {
    const scope = this.$controller.scope;
    console.log(Object.is(scope.overrideContext.bindingContext, scope.bindingContext)); // true
  }
}
```
{% endcode %}

This makes the binding context readily available, even when we dealing with override context, without necessarily traverse via the scope.
With this information, we can again change our diagram to the following one.

```text
+---------------------------------+
|                                 |
|     Scope                       |
|                                 |
|     +----------------+          |
|     |                |          |
|  +--> bindingContext |          |
|  |  |                |          |
|  |  +----------------+          |
|  |                              |
|  |                              |
|  +--------------------------+   |
|                             |   |
|     +---------------------+ |   |
|     |                     | |   |
|     | overrideContext     | |   |
|     |                     | |   |
|     | +----------------+  | |   |
|     | |                |  | |   |
|     | | bindingContext +----+   |
|     | |                |  |     |
|     | +----------------+  |     |
|     |                     |     |
|     +---------------------+     |
|                                 |
+---------------------------------+

```

## Parent scope

If after following the discussion so far, if you are wondering 'If the expressions are evaluated based on the context, why do we even need scope?', let me tell you again that it is a great question.
Apart from serving a s logical container to the contexts, a scope also optionally point to the parent scope.
Let us consider the following example to understand that.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({ name: 'foo-bar', template: `\${message} \${$parent.message}` })
export class FooBar implements ICustomElementViewModel {
  public readonly message: string = 'Hello Foo-Bar!';
  public readonly $controller: ICustomElementController<this>;

  public binding(): void {
    const scope = this.$controller.scope;
    console.log(scope.parentScope.bindingContext instanceof App); // true
  }
}

@customElement({
  name: 'app',
  template: '<foo-bar></foo-bar>',
  dependencies: [FooBar]
})
export class App implements ICustomElementViewModel {
  public readonly message: string = 'Hello App!';
  public readonly $controller: ICustomElementController<this>;

  public binding(): void {
    console.log(this.$controller.scope.parentScope); // null
  }
}
```
{% endcode %}

In the example above, `App` uses the `FooBar` custom element, and both have property named `message`, initialized with different values.
As expected, the rendered output in this case is `Hello Foo-Bar! Hello App!`.
You might have used the `$parent` keyword a lot, but for completeness, it should be clarified that the parent scope can be accessed using the `$parent` keyword.
In the example above `FooBar#$controller.scope.parentScope.bindingContext` points to the instance of `App` where `<foo-bar>` is used.
In short, every instance of scope has a `parentScope` property that points to the parent scope, when available.

With this information, our diagram changes for one last time.

```text
      +----------------------------------+       +----------------------------------+
+---->+                                  |       |                                  |
|     |     Scope                        |       |     Scope                        |
|     |                                  |       |                                  |
|     |     +--------------+             |       |     +--------------+             |
|     |     |              |             |       |     |              |             |
|     |     | parentScope  |             |       |     | parentScope  +-------------------+
|     |     |              |             |       |     |              |             |     |
|     |     +--------------+             |       |     +--------------+             |     |
|     |                                  |       |                                  |     |
|     |     +----------------+           |       |     +----------------+           |     |
|     |     |                |           |       |     |                |           |     |
|     |  +--> bindingContext |           |       |  +--> bindingContext |           |     |
|     |  |  |                |           |       |  |  |                |           |     |
|     |  |  +----------------+           |       |  |  +----------------+           |     |
|     |  |                               |       |  |                               |     |
|     |  |                               |       |  |                               |     |
|     |  +--------------------------+    |       |  +--------------------------+    |     |
|     |                             |    |       |                             |    |     |
|     |     +---------------------+ |    |       |     +---------------------+ |    |     |
|     |     |                     | |    |       |     |                     | |    |     |
|     |     | overrideContext     | |    |       |     | overrideContext     | |    |     |
|     |     |                     | |    |       |     |                     | |    |     |
|     |     | +----------------+  | |    |       |     | +----------------+  | |    |     |
|     |     | |                |  | |    |       |     | |                |  | |    |     |
|     |     | | bindingContext +----+    |       |     | | bindingContext +----+    |     |
|     |     | |                |  |      |       |     | |                |  |      |     |
|     |     | +----------------+  |      |       |     | +----------------+  |      |     |
|     |     |                     |      |       |     |                     |      |     |
|     |     +---------------------+      |       |     +---------------------+      |     |
|     |                                  |       |                                  |     |
|     +----------------------------------+       +----------------------------------+     |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

## Host scope

As we are talking about scope, it needs to be noted that 'host scope' is used in the context of `au-slot`.
There is no difference between a "normal" scope and a host scope, just it acts as the special marker to instruct to use the scope of the host element, instead of scope of the parent element.
Moreover, this is a special kind of scope that is valid only in the context of `au-slot`.
This is already discussed in detail in the [`au-slot` documentation](./components-revisited.md#au-slot), and thus not repeated here.

## Context and change observation

Now let us discuss briefly about change observation.
A comprehensive discussion on change observation is bit out of scope of this documentation.
However, for this discussion it would suffice to say that generally whenever Aurelia binds an expression to the view, it also employs one or more observers for that.
This is how when the value of the underlying property changes, the change is is propagated to view or other associated components.
The focus of this discussion is how some interesting scenarios occur in conjunction of binding/override context and the change observation.

Let us consider a simple example first.


{% code title="App.ts" %}
```typescript
import {
  IPlatform,
} from '@aurelia/kernel';
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'app',
  template: `\${message}`,
})
export class App implements ICustomElementViewModel {
  public message: string = 'Hello App!';
  public readonly $controller: ICustomElementController<this>;
  private intervalId: ReturnType<IPlatform['setInterval']>;

  public constructor(
    @IPlatform private readonly platform: IPlatform,
  ) { }

  public attached(): void {
    const scope = this.$controller.scope;
    let i = 1;

    this.intervalId = this.platform.setInterval(() => {
      scope.bindingContext.message = `Hello App! #i: ${i++}`;
    }, 1000);

    // this.intervalId = this.platform.setInterval(() => {
    //   this.message = `Hello App! #i: ${i++}`;
    // }, 1000);
  }

  public detaching(): void {
    this.platform.clearInterval(this.intervalId);
  }
}
```
{% endcode %}

The example above updates the `message` property of the binding context in every 1 second.
As Aurelia is also observing the property, the interpolated output is also updated after every 1 second.
Note that as the `scope.bindingContext` above points to the `this`, updating `this.message` like that way has same effect.

As the next example, we change the property in both binding context and override context.

{% code title="App.ts" %}
```typescript
import {
  IPlatform,
} from '@aurelia/kernel';
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'app',
  template: `\${message}`,
})
export class App implements ICustomElementViewModel {
  public message: string = 'Hello App!';
  public readonly $controller: ICustomElementController<this>;
  private intervalId1: ReturnType<IPlatform['setInterval']>;
  private intervalId2: ReturnType<IPlatform['setInterval']>;

  public constructor(
    @IPlatform private readonly platform: IPlatform,
  ) { }

  public attached(): void {
    const scope = this.$controller.scope;
    let i = 1;

    this.intervalId1 = this.platform.setInterval(() => {
      scope.bindingContext.message = `Hello Binding Context! #i: ${i++}`;
    }, 1000);

    this.intervalId2 = this.platform.setInterval(() => {
      scope.overrideContext.message = `Hello Override Context! #i: ${i}`;
    }, 1000);
  }

  public detaching(): void {
    const platform = this.platform.
    platform.clearInterval(this.intervalId1);
    platform.clearInterval(this.intervalId2);
  }
}
```
{% endcode %}

All though it has been said before that the property in override context takes precedence over binding context, the output from the example above is `Hello Binding Context! #i: 1`, `Hello Binding Context! #i: 2`, and so on.
The reason for this behavior is because of the fact that the `scope.bindingContext.message` is in fact bound to the view instead of `scope.overrideContext.message`, as the later was non-existent during binding phase (note that the values are being changed in `attached` lifecycle hook).
Therefore, the change observation is also applied for the `scope.bindingContext.message` as opposed to that of override context.
This explains why updating the `scope.overrideContext.message` is rather 'futile' in the example above.

However, the result would have been quite different, if the `message` property is introduced to override context during the `binding` phase.

{% code title="App.ts" %}
```typescript
import {
  IPlatform,
} from '@aurelia/kernel';
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'app',
  template: `\${message}`,
})
export class App implements ICustomElementViewModel {
  public message: string = 'Hello App!';
  public readonly $controller: ICustomElementController<this>;
  private intervalId1: ReturnType<IPlatform['setInterval']>;
  private intervalId2: ReturnType<IPlatform['setInterval']>;

  public constructor(
    @IPlatform private readonly platform: IPlatform,
  ) { }

  public binding(): void {
    this.$controller.scope.overrideContext.message = 'Hello Override Context!';
  }

  public attached(): void {
    const scope = this.$controller.scope;
    let i = 1;

    this.intervalId1 = this.platform.setInterval(() => {
      scope.bindingContext.message = `Hello Binding Context! #i: ${i++}`;
    }, 1000);

    this.intervalId2 = this.platform.setInterval(() => {
      scope.overrideContext.message = `Hello Override Context! #i: ${i}`;
    }, 1000);
  }

  public detaching(): void {
    const platform = this.platform.
    platform.clearInterval(this.intervalId1);
    platform.clearInterval(this.intervalId2);
  }
}
```
{% endcode %}

Note that the example above introduces the `message` property in the override context during the `binding` phase.
When the interpolation expression is evaluated in the view, it is that property from the override context that ends up being bound.
This means that the `message` property in override context is also observed.
Thus, quite expectedly in every 1 second output of the above shown example changes as `Hello Override Context! #i: 1`, `Hello Override Context! #i: 2`, and so on.

## Context selection

So far we have seen various aspect of scope, binding and override context.
One thing we have not addressed so far is how the contexts are selected for expression evaluation or assignment.
In this section we will look into that aspect.

The context selection process can be summed up (simplified) as follows.

1. IF `$parent` keyword is used once or several times, THEN
   1. traverse up the scope, the required number of parents (that is for `$parent.$parent.foo`, we will go two step up)
   2. RETURN override context if the desired property is found there, ELSE RETURN binding context.
2. ELSE
   1. LOOP till either the desired property is found in the context or the component boundary is hit. Then perform the following.
   2. IF the desired property is found in the override context return override context.
   3. ELSE IF the binding mode is `from-view` and the desired property does not exists in binding context as well RETURN override context.
   4. ELSE RETURN binding context.

The first rule involving `$parent` should be self explanatory.
We will focus on the second part.

Let us first see an example to demonstrate the utility of the rule `#2.1.`.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'foo-bar',
  template: `<div repeat.for="i of 3">
  <div repeat.for="j of 2">
    \${message} \${$parent.i} \${j}
  </div>
  </div>` })
export class FooBar implements ICustomElementViewModel {
  public readonly message: string = 'Hello Foo-Bar!';
}

@customElement({
  name: 'app',
  template: '<foo-bar></foo-bar>',
  dependencies: [FooBar]
})
export class App implements ICustomElementViewModel {
  public message: string = 'Hello App!';
}
```
{% endcode %}

As expected, the example produces the following output.

```text
Hello Foo-Bar! 0 0
Hello Foo-Bar! 0 1
Hello Foo-Bar! 1 0
Hello Foo-Bar! 1 1
Hello Foo-Bar! 2 0
Hello Foo-Bar! 2 1
```

Note that both `App` and `FooBar` initializes their own `message` properties.
According to our rule `#2.4.` binding context is selected, and the corresponding `message` property is bound to the view.
However, it is important to note that if the `FooBar#message` stays uninitialized, that is the `message` property exists neither in binding context nor in override context, the output would have been as following.

```text
0 0
0 1
1 0
1 1
2 0
2 1
```

Although it should be quite as per expectation, the point to be highlighted here is that the scope traversal never reaches to `App` in the process.
This is because of the 'component boundary' clause in rule `#2.1.`.
In case of this example the expression evaluation starts with the scope of the innermost `repeat.for`, and traversed upwards.
When traversal hits the scope of `FooBar`, it recognize the scope as a component boundary, and stops traversing any further, irrespective of whether the property is found or not.
Contextually note that if you want to cross the component boundary, you need to explicitly use `$parent` keyword.

The rule `#2.2.` is also self explanatory, as we have seen plenty examples of override context precedence so far.
Thus the last bit of this story boils down to rules `#2.3.`, and `#2.4.`.
Let us first look at the rule `#2.4.` in isolation.
This rule facilitates using an uninitialized property in binding context by default or as fallback, as can be seen in the example below.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'app',
  template: `\${message}`,
})
export class App implements ICustomElementViewModel {
  public message: string;

  public constructor(
    @IPlatform private readonly platform: IPlatform,
  ) { }

  public attached(): void {
    const platform = this.platform;
    const id = platform.setTimeout(() => {
      this.message = 'Hello World!';
      platform.clearTimeout(id);
    }, 2000);
  }
}
```
{% endcode %}

The example shown above produces `Hello World!` as output after 2 seconds of the invocation of the `attached` hook.
This happens because of the fall back to binding context by the rule `#2.4.`.
However, there are some cases where this fallback is undesired.
Consider the following markup for example.

{% code title="App.html" %}
```
<div repeat.for="i of 3">
  <raise-two input.bind="i+1" output.from-view="op"></raise-two>
  <show-output value.bind="op"></show-output>
</div>
```
{% endcode %}

In the above example the custom element `raise-two` takes an input, raises that input to 2, and returns that value as output in form of `output.from-view` binding.
The output `op` property is then propagated to the `show-output` which finally shows the output.
This might be an extremely tailored example, but such use-cases might not be that rare.
In this case, it is not desired to select (by fallback) the binding context to assign the `op` property from the `from-view` binding, because that would mean that we will have the following output.

```
9
9
9
```

However, the desired output in this case would be the following.

```
1
4
9
```

This is where the rule `#2.3.` helps, by selecting the override context when the binding mode is `from-view`, and the property is not found in the binding context.
More specifically, in relation to `repeat.for` the rule `#2.3.` selects the override context of the scope of the individual views created by the `repeat.for`
The complete example is shown below.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'raise-two'
})
export class RaiseTwo {
  @bindable public input: number;
  @bindable public output: number;

  public binding(): void {
    this.output = this.input ** 2;
  }
}
@customElement({
  name: 'show-output',
  template: `\${value}`
})
export class ShowOutput {
  @bindable public value: number;
}

@customElement({
  name: 'app',
  template: `<div repeat.for="i of 3">
  <raise-two input.bind="i+1" output.from-view="op"></raise-two>
  <show-output value.bind="op"></show-output>
</div>`,
  dependencies: [RaiseTwo, ShowOutput]
})
export class App implements ICustomElementViewModel { }
```
{% endcode %}

Let us consider another simpler example.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'raise-two'
})
export class RaiseTwo {
  @bindable public input: number;
  @bindable public output: number;

  public binding(): void {
    this.output = this.input ** 2;
  }
}
@customElement({
  name: 'show-output',
  template: `\${value}`
})
export class ShowOutput {
  @bindable public value: number;
}

@customElement({
  name: 'app',
  template: `<raise-two input.bind="i+1" output.from-view="op"></raise-two>
  <show-output value.bind="op"></show-output>`,
  dependencies: [RaiseTwo, ShowOutput]
})
export class App implements ICustomElementViewModel {
  private op: number;
  public readonly $controller: ICustomElementController<this>;

  public attached(): void {
    const scope = this.$controller.scope;
    console.log(scope.overrideContext.op === 100); // true
    console.log('op' in scope.bindingContext);     // false
    console.log('op' in this);                     // false
  }
}
```
{% endcode %}

The example above is almost similar to the one before.
The difference is that here there is no `repeat.for`, and we inspect the contexts in the `attached` hook.
We can see that the `op` property bound from the `from-view` mode indeed ends up in the override context instead of the binding context.

The example however begets the question "How to access the property in view model that is bound from view, without performing the gymnastics with `$controller` and `scope`?"
In fact we can assert - as shown in the example below - that even if we periodically update the `op` property in VM, the output never changes.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'raise-two'
})
export class RaiseTwo {
  @bindable public input: number;
  @bindable public output: number;

  public binding(): void {
    this.output = this.input ** 2;
  }
}
@customElement({
  name: 'show-output',
  template: `\${value}`
})
export class ShowOutput {
  @bindable public value: number;
}

@customElement({
  name: 'app',
  template: `<raise-two input.bind="i+1" output.from-view="op"></raise-two>
  <show-output value.bind="op"></show-output>`,
  dependencies: [RaiseTwo, ShowOutput]
})
export class App implements ICustomElementViewModel {
  private op: number;
  public readonly $controller: ICustomElementController<this>;

  public constructor(
    @IPlatform private readonly platform: IPlatform,
  ) { }

  public attached(): void {
    let i = 1;
    this.intervalId = this.platform.setInterval(() => {
      this.op = i++;
    }, 1000);
  }

  public detaching(): void {
    this.platform.clearInterval(this.intervalId);
  }
}
```
{% endcode %}

{% hint style="info" %}
Due to our previous discussion we know know that the behavior is only logical as the `op` property is not in the binding context.
Why don't you assert by yourself whether updating the `op` property in the override context actually updates the output or not?
{% endhint %}

If we do want to access the `from-view` bound value inside the view model, the solution is to simply initialize the property.
Note this bit in the rule `#2.3.`:

> ... and the desired property does not exists in binding context as well ...

So as a last example, we initialize the `op` property and assert in the `attached` hook that indeed we have access to the same value.

{% code title="App.ts" %}
```typescript
import {
  customElement,
  ICustomElementController,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';

@customElement({
  name: 'raise-two'
})
export class RaiseTwo {
  @bindable public input: number;
  @bindable public output: number;

  public binding(): void {
    this.output = this.input ** 2;
  }
}
@customElement({
  name: 'show-output',
  template: `\${value}`
})
export class ShowOutput {
  @bindable public value: number;
}

@customElement({
  name: 'app',
  template: `<raise-two input.bind="i+1" output.from-view="op"></raise-two>
  <show-output value.bind="op"></show-output>`,
  dependencies: [RaiseTwo, ShowOutput]
})
export class App implements ICustomElementViewModel {
  private op: number = undefined!;

  public attached(): void {
    console.log(this.op); // 100
  }
}
```
{% endcode %}

If you have followed this so far, you have earned my respect as well as a tea break.
Go have that tea break!
Hope you have enjoyed this documentation as much as you will enjoy that tea.
Have fun with Aurelia2!