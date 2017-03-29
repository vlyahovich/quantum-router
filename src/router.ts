/**
 * Big thanks to malankajs router https://github.com/malankajs/malanka/
 * Just awesome :)
 */

import {
    RouterEvent,
    RouterOptions,
    RouterEventHandler,
    RouterEventPromise,
    RouterMiddleware,
    RouterMiddlewareSuccess,
    RouterMiddlewareError
} from './declarations';
import {promiseDebounce} from './util/promiseDebounce';
import {uniqId} from './util/uniqId';

const optionalParam: RegExp = /\(([^)]+)\)/g;
const namedParam: RegExp = /:([^/()]+)/g;
const splatParam: RegExp = /\*\w+/g;
const ROUTER_ERROR: string = 'RouterError';

let stopPropagation = function () {
    this.propagationStopped = true;
};

export class RouterError extends Error {
    event?: RouterEvent;
    status?: number;

    constructor(error, event) {
        super();

        this.name = ROUTER_ERROR;

        if (error instanceof Error) {
            this.message = error.message;
            this.stack = error.stack;
        } else {
            if (typeof error.status !== 'undefined') { // xhr
                this.status = error.status;
                this.message = error.statusText;
            } else { // generic error
                this.message = error;
            }

            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, RouterError);
            } else {
                this.stack = (new Error()).stack;
            }
        }

        this.event = event;
    }
}

export class Router {
    protected routes: RouterEventHandler[];
    protected index: Object;
    protected middleware: RouterMiddleware[];
    protected lastEvent: RouterEvent;
    private resolveMiddlewareDebounced: Function;
    private popstateHandle: EventListener;
    private clickHandle: EventListener;

    constructor({routes}: RouterOptions) {
        this.routes = [];
        this.index = {};
        this.middleware = [];

        this.resolveMiddlewareDebounced = promiseDebounce(this.resolveMiddleware, this, (promise, event) => event.id);

        this.bindRoutes(routes);
    }

    protected bindRoutes(routes: Object) {
        let routesKeys: string[] = Object.keys(routes),
            route;

        while ((route = routesKeys.shift()) != null) {
            this.addRoute(routes[route], route)
        }
    }

    protected addRoute(name: string, route: string) {
        let {regexp, names} = this.routeToRegexp(route);

        this.index[name] = route;

        this.routes.push(this.buildRouteHandler(regexp, name, names));
    }

    protected routeToRegexp(route: string): { names: string[], regexp: RegExp } {
        let names: string[] = [],
            replacedRoute = route
                .replace(optionalParam, (match, value) => `(?:${value})?`)
                .replace(namedParam, (match, value) => {
                    names.push(value);

                    return '([^/]+)';
                })
                .replace(splatParam, '([^?]*?)');

        return {
            names,
            regexp: new RegExp(`^${replacedRoute}$`)
        };
    }

    protected buildRouteHandler(regExp: RegExp, name: string, names: string[]): RouterEventHandler {
        return (url, query, hash, state) => {
            let match = url.match(regExp),
                params = {};

            if (match) {
                let id = uniqId('event');

                names.forEach((name, index) => params[name] = this.normalizeParam(match[index + 1]));

                return {id, url, name, params, query, hash, state, stopPropagation};
            }
        }
    }

    public normalizeParam(value: string): string | number | boolean {
        value = decodeURIComponent(value);

        if (value === 'true' || value === 'false') {
            return value === 'true';
        } else {
            let num = Number(value);

            if (String(num) === value && num === num) {
                return num;
            }
        }

        return value;
    }

    public buildQueryString(query: Object): string {
        return Object.keys(query)
            .filter((key) => query[key] != null && query[key] !== '')
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
            .join('&');
    }

    public buildQuery(baseUrl: string): Object {
        let queryString = baseUrl.split('?')[1],
            query = {};

        if (queryString) {
            let queryParts = queryString.split('&');

            for (let index = 0; index < queryParts.length; index++) {
                let [key, value] = queryParts[index].split('=');

                key = decodeURIComponent(key);

                query[key] = this.normalizeParam(value);
            }
        }

        return query;
    }

    public match(input: string, state?: Object): RouterEventPromise {
        let [baseUrl, hash = ''] = input.replace(/^https?:\/\/[^\/]+/, '').split('#'),
            [url] = baseUrl.split('?'),
            query = this.buildQuery(baseUrl),
            event;

        for (let index = 0; index < this.routes.length && !event; index++) {
            event = this.routes[index](url, query, hash, state);
        }

        let promise = event ?
            Promise.resolve(event) :
            Promise.reject(new Error(`Cannot match url "${url}"`));

        if (!event) {
            event = {
                name: 'error',
                code: 404,
                state
            };
        }

        this.lastEvent = event;

        return this.resolveMiddlewareDebounced(promise, event);
    }

    public matchEvent(event: RouterEvent): RouterEventPromise {
        let input = event.url,
            queryString = this.buildQueryString(event.query);

        if (queryString) {
            input = input + '?' + queryString;
        }

        if (event.hash) {
            input = input + '#' + event.hash;
        }

        return this.match(input, event.state);
    }

    protected resolveMiddleware(promise: Promise<any>, event: RouterEvent): RouterEventPromise {
        return this.middleware.reduce((promise, [success, error]) => {
            let resultPromise = promise;

            if (success) {
                resultPromise = resultPromise.then((event) => {
                    if (!event.propagationStopped) {
                        return success(event);
                    }
                })
            }

            if (error) {
                resultPromise = resultPromise.catch(this.wrapError(error, event));
            }

            return resultPromise.then(() => event);
        }, promise);
    }

    protected wrapError(errorHandler: (RouterError) => any, event: RouterEvent) {
        return (err) => {
            let error = err.name === ROUTER_ERROR ? err : new RouterError(err, event);

            return errorHandler(error);
        };
    }

    public use(success: RouterMiddlewareSuccess, error?: RouterMiddlewareError) {
        this.middleware.push([success, error]);
    }

    public start(): RouterEventPromise {
        if (typeof window !== 'undefined') {
            this.popstateHandle = this.windowPopStateHandle.bind(this);

            window.addEventListener('popstate', this.popstateHandle);
        }

        if (typeof document !== 'undefined') {
            this.clickHandle = this.documentClickHandle.bind(this);

            document.body.addEventListener('click', this.clickHandle);
        }

        return this.matchCurrentUrl();
    }

    public stop() {
        if (typeof window !== 'undefined' && this.popstateHandle) {
            window.removeEventListener('popstate', this.popstateHandle);
        }

        if (typeof document !== 'undefined' && this.clickHandle) {
            document.body.removeEventListener('click', this.clickHandle);
        }
    }

    protected windowPopStateHandle(event: PopStateEvent) {
        this.matchCurrentUrl(event.state);
    }

    protected documentClickHandle(event: Event) {
        let link = event.target as HTMLAnchorElement;

        if (link instanceof HTMLAnchorElement) {
            if (link.getAttribute('target')) {
                return;
            }

            event.preventDefault();

            this.navigate(link.href);
        }
    }

    public navigate(url: string, params: { replace?: boolean, trigger?: boolean, state?: Object } = {}): RouterEventPromise {
        let {replace = false, trigger = true, state} = params;

        if (typeof history === 'undefined') {
            return Promise.resolve();
        }

        if (replace) {
            history.replaceState(state, '', url);
        } else {
            history.pushState(state, '', url);
        }

        if (trigger) {
            return this.match(url);
        } else {
            return Promise.resolve();
        }
    }

    public reverse(routeName: string, params: Object = {}): string | void {
        let route = this.index[routeName],
            keys = Object.keys(params),
            reqMiss = [];

        if (!route) {
            return null;
        }

        let accept = (value) => value != null && value !== '';

        let interpolate = (str, err?) => {
            return str.replace(/:([^)/]+)/g, (match, name) => {
                let index = keys.indexOf(name);

                if (index > -1 && accept(params[name])) {
                    keys.splice(index, 1);

                    return encodeURIComponent(String(params[name]));
                } else {
                    if (err) {
                        err.push(name);
                    }

                    return match;
                }
            });
        };

        route = route.replace(/\(([^)]+)\)/g, (match, value) => {
            let str = interpolate(value);

            if (str !== value) {
                return str;
            } else {
                return '';
            }
        });

        route = interpolate(route, reqMiss);

        if (reqMiss.length) {
            console.warn(`Cannot reverse route "${routeName}"`,
                `Falling back to empty hash string: missing required params are [${reqMiss.join()}]`);

            return '#';
        }

        if (keys.length) {
            let query = [];

            keys.forEach(key => {
                if (accept(params[key])) {
                    query.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
                }
            });

            if (query.length) {
                route += '?' + query.join('&');
            }
        }

        return route;
    }

    public reverseReplace(replaceQuery: Object): string | void {
        let {name, params, query} = this.lastEvent;

        return this.reverse(name, Object.assign({}, params, query, replaceQuery));
    }

    protected matchCurrentUrl(state?: Object): RouterEventPromise {
        return this.match(location.href, state);
    }
}
