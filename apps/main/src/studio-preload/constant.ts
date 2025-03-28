export const ELEMENT_SELECTOR = 'data-element-id';

export function queryElementByObjectId(objectId: string) {
  return document.querySelector(`[${ELEMENT_SELECTOR}="${objectId}"]`);
}
