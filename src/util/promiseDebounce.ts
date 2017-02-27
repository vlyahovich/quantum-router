let flow = (g, f) => {
    return function (...args) {
        f(g(...args));
    };
};

export function promiseDebounce(fn, ctx, marker) {
    let pending = null,
        next = null,
        clear = () => pending = null;

    return function (...args) {
        if (pending) {
            if (marker) {
                next = marker(...args);

                return new Promise((resolve, reject) => {
                    let resolveNext = function resolveNext() {
                        // if only next is the last function then we execute it,
                        // otherwise it will be unresolved
                        if (next === marker(...args)) {
                            pending = fn.call(ctx, ...args);

                            // do clear first to prevent pending to stay for next iterations
                            pending.then(flow(clear, resolve), flow(clear, reject));
                        }
                    };

                    if (pending) {
                        pending.then(resolveNext, resolveNext);
                    } else {
                        resolveNext();
                    }
                });
            } else {
                return pending;
            }
        }

        pending = fn.call(ctx, ...args);
        pending.then(clear, clear);

        return pending;
    }
}
