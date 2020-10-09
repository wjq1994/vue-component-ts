declare namespace domjs {
    export function addClass(el: any, cls: string[]): void;
    export function removeClass(el: any, cls: string): string;
    export function insertHtmlAtCaret(el: any, cls: string): string;
    export function on(element: any, event: any, handler: any): void;
    export function off(element: any, event: any, handler: any): void;
    export function isContains(root: Element, element: Element): void;
    export function addAttributes(element: any, attributes: string[]): void;
    export function getOffsetParent(el: any): void;
    export function isFixed(el: any): void;
    export function setStylePx(element: any, styles: any): void;
    export const root: any;
    export function getOffsetRectRelativeToCustomParent(element: any, parent: any, fixed: boolean): void;
    export function getOuterSizes(element: any): void;
    export function getScrollParent(element: any): void;
    export function getOffsetRect(element: any): void;
    export function getBoundingClientRect(element: any): void;
    export function isFunction(functionToCheck: any): void;
    export function getArrayKeyIndex(arr: array[], keyToFind?: number): void;
    export function getSupportedPropertyName(property: any): void;
    export function getPopperClientRect(popperOffsets: any): void;
    export function getOppositePlacement(placement: any): void;
}

export = domjs
