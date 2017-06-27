import {RouterError} from './router';

export interface RouterEvent {
    url: string;
    name: string;
    params?: Object;
    query: Object;
    hash: Object;
    code?: number;
    state?: Object;
    stopPropagation: Function;
    propagationStopped?: boolean;
}

export interface RouterOptions {
    routes: Object;
}

export interface RouterUrlMeta {
    baseUrl: string;
    url: string;
    hash: string;
    query: Object;
    event: RouterEvent;
}

export declare type RouterMiddlewareSuccess = (event: RouterEvent) => RouterEventPromise;

export declare type RouterMiddlewareError = (error: RouterError) => RouterEventPromise;

export declare type RouterMiddleware = [RouterMiddlewareSuccess, RouterMiddlewareError];

export declare type RouterEventHandler = (url: string, query: Object, hash: Object, state: Object) => RouterEvent;

export declare type RouterEventPromise = Promise<RouterEvent|void>;
