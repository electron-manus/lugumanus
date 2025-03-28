import { ELEMENT_SELECTOR, queryElementByObjectId } from '../constant';

export function setupInputOperations() {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    setValue(this: any, value: string, objectId: string) {
      const element = queryElementByObjectId(objectId);
      console.log(
        '🚀 ~ setValue ~ objectId:',
        objectId,
        value,
        element,
        `[${ELEMENT_SELECTOR}="${objectId}"]`,
        document.querySelector(`[${ELEMENT_SELECTOR}="${objectId}"]`),
      );
      if (!element) {
        return;
      }

      // 尝试设置值并记录是否成功
      let valueSet = false;

      // 处理标准表单元素
      if (
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT'
      ) {
        const inputElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

        // 处理不同类型的输入元素
        if (element.tagName === 'INPUT') {
          const inputType = (element as HTMLInputElement).type.toLowerCase();

          if (['checkbox', 'radio'].includes(inputType)) {
            // 对于复选框和单选按钮，根据值设置checked属性
            (element as HTMLInputElement).checked =
              value === 'true' || value === '1' || value === 'on';
            valueSet = true;
          } else if (inputType === 'file') {
            // 文件输入无法通过JavaScript直接设置值
            // TODO:
            // @ts-ignore
            this.showNotification?.('无法直接设置文件输入框的值，这需要用户交互');
            return;
          } else {
            // 其他类型的输入框
            inputElement.value = value;
            valueSet = true;
          }
        } else {
          // 文本区域或下拉框
          inputElement.value = value;
          valueSet = true;
        }

        // 触发相关事件，确保监听这些事件的代码能够执行
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // 处理contenteditable元素
      else if (
        element.hasAttribute('contenteditable') &&
        element.getAttribute('contenteditable') !== 'false'
      ) {
        element.textContent = value;
        valueSet = true;

        // 触发输入事件
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // 处理自定义富文本编辑器
      else if (
        element.classList.contains('editor') ||
        element.classList.contains('rich-text') ||
        element.getAttribute('role') === 'textbox'
      ) {
        // 尝试设置内容 - 这可能需要根据具体的编辑器定制
        element.textContent = value;
        valueSet = true;
      }
      // 处理有value属性但不是标准输入元素的情况
      else if ('value' in element) {
        element.value = value;
        valueSet = true;
      }

      // 如果未能设置值，显示提示
      if (!valueSet) {
        // 实现并显示一个 toast 提示
        const toast = document.createElement('div');
        toast.textContent = '当前元素不是可输入类型，无法设置值';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '2147483648';
        toast.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';

        document.body.appendChild(toast);

        // 3秒后自动移除提示
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      }

      // 返回元素所有的属性
      return Object.fromEntries(
        Array.from(element.attributes).map((attr) => [attr.name, attr.value]),
      );
    },
  };
}
