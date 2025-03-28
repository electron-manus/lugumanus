import { DOMDomainAnalyzer } from '@lugu-manus/shrink-dom';
import { ELEMENT_SELECTOR, queryElementByObjectId } from '../constant';

const analyzer = new DOMDomainAnalyzer({
  enableHighlight: true,
  highlightDuration: 1,
});

export function setupDOMOperations() {
  return {
    // 获取到打了标记的 DOM 树 html
    getAnnotatedHTML(): string {
      const html = analyzer.getAnalyzedHTML();
      return html;
    },

    async geObjectIdByElementById(id: number): Promise<string> {
      const element = analyzer.getElements()[id];
      if (!element) {
        return '';
      }
      let elementId = element.getAttribute(ELEMENT_SELECTOR) || '';
      if (!elementId) {
        elementId = Math.random().toString(36).substring(2, 15);
        element.setAttribute(ELEMENT_SELECTOR, elementId);
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return elementId;
    },

    async getObjectIdByFocusElement() {
      const element = document.activeElement;
      if (!element) {
        return '';
      }
      let elementId = element.getAttribute(ELEMENT_SELECTOR) || '';
      if (!elementId) {
        elementId = Math.random().toString(36).substring(2, 15);
        element.setAttribute(ELEMENT_SELECTOR, elementId);
      }
      return elementId;
    },

    async getElementAttribute(objectId: string, attribute = 'aria-label') {
      const element = document.querySelector(`[${ELEMENT_SELECTOR}="${objectId}"]`);
      if (!element) {
        return '';
      }
      return element.getAttribute(attribute) || '';
    },

    // 获取元素是否一个输入框
    isInputElement(objectId: string) {
      const element = document.querySelector(`[${ELEMENT_SELECTOR}="${objectId}"]`);
      if (!element) {
        return false;
      }

      // 检查标准输入元素
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        return true;
      }

      // 检查可编辑内容元素
      if (element.getAttribute('contenteditable') === 'true') {
        return true;
      }

      // 检查选择元素
      if (element.tagName === 'SELECT') {
        return true;
      }

      // 检查具有特定角色的元素
      const role = element.getAttribute('role');
      if (role && ['textbox', 'searchbox', 'combobox'].includes(role)) {
        return true;
      }

      return false;
    },

    async scrollIntoView(objectId: string) {
      const element = document.querySelector(`[${ELEMENT_SELECTOR}="${objectId}"]`);
      if (!element) {
        return;
      }
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },

    async getBoundingClientRect(objectId: string) {
      const element = queryElementByObjectId(objectId);
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    },

    blurElement() {
      if (document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      } else {
        document.body.focus();
      }
    },
  };
}
