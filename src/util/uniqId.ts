let idCounter = 0;

export function uniqId(prefix) {
    return `${prefix}${++idCounter}`;
}
