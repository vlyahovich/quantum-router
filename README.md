quantum-router
========


```js
import {Router} from './router/router';

let router = new Router({
    routes: {
        'user(/:login)': 'user',
        'page:/:id': 'page',
        '': 'home'
    }
});
```

Routing system for SPA

## How it works

Router functionality can be extended by middleware functions.
In client-side chain executes when url matched by browser.
In server-side (client-side too) route can be matched by `match` method.
Middleware can be added as follows:

```js
router.use(function (event) {
    // middleware logic
}, function () {
    // error
});
```

Then in client-side you need to execute `start` method by calling `router.start()`.
This adds event listeners to window popstate and links click to handle navigation.
Or you can simply call `match` or `matchCurrentUrl` to start.

## Router event object

Route event is an object containing useful information about current route
and can be extended in middleware chain. Event object is passed as first argument to middleware.

Router event properties:

| Property name             | Description                                                                              |
|:------------------------- |:---------------------------------------------------------------------------------------- |
| `id`                      | Unique id                                                                                |
| `name`                    | Route name                                                                               |
| `params`                  | Params hash                                                                              |
| `query`                   | Query hash                                                                               |
| `hash`                    | Hash                                                                                     |
| `state`                   | History state                                                                            |

## Stop propagation

You can stop propagate event to further middleware by executing `event.stopPropagation()` in middleware body.
This causes to stop executing further middleware functions in chain.

## Reverse route by params

Route can be reversed to string by passing route name and its desired params to `reverse` method.
This is useful if you want to keep up to date your links around app.

### es5 version

es5 version can be found at `dist` folder.
