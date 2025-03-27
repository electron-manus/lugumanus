// run in browser

export class DOMDomainAnalyzer {
  private annotatedElements: HTMLElement[] = [];
  private interactiveElements: HTMLElement[] = [];

  private annotationAttribute: string;
  private minInteractiveSize: number;
  private highlightStyle: string;
  private highlightDuration: number;
  private enableHighlight: boolean;

  // 提取默认配置常量
  private static readonly DEFAULT_CONFIG = {
    ANNOTATION_ATTRIBUTE: 'data-element-id',
    MIN_INTERACTIVE_SIZE: 20,
    HIGHLIGHT_STYLE: 'brightness(1.2) contrast(1.1)',
    HIGHLIGHT_DURATION: 500,
    ENABLE_HIGHLIGHT: true,
    TRANSITION_STYLE: 'filter 0.3s ease',
  };

  // 提取交互式标签和属性常量
  static readonly INTERACTIVE_TAGS = ['A', 'BUTTON'];
  static readonly INTERACTIVE_INPUT_TYPES = [
    'button',
    'submit',
    'reset',
    'checkbox',
    'radio',
    'file',
  ];
  static readonly INTERACTIVE_ROLES = ['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab'];
  static readonly NON_EDITABLE_INPUT_TYPES = ['button', 'submit', 'reset', 'hidden', 'file'];

  static readonly ELEMENT_NODE = 1;

  constructor(
    options: {
      annotationAttribute?: string;
      minInteractiveSize?: number;
      highlightStyle?: string;
      highlightDuration?: number;
      enableHighlight?: boolean;
    } = {},
  ) {
    this.annotationAttribute =
      options.annotationAttribute || DOMDomainAnalyzer.DEFAULT_CONFIG.ANNOTATION_ATTRIBUTE;
    this.minInteractiveSize =
      options.minInteractiveSize || DOMDomainAnalyzer.DEFAULT_CONFIG.MIN_INTERACTIVE_SIZE;
    this.highlightStyle =
      options.highlightStyle || DOMDomainAnalyzer.DEFAULT_CONFIG.HIGHLIGHT_STYLE;
    this.highlightDuration =
      options.highlightDuration || DOMDomainAnalyzer.DEFAULT_CONFIG.HIGHLIGHT_DURATION;
    this.enableHighlight =
      options.enableHighlight !== undefined
        ? options.enableHighlight
        : DOMDomainAnalyzer.DEFAULT_CONFIG.ENABLE_HIGHLIGHT;
  }

  public getElements(): HTMLElement[] {
    return [...this.annotatedElements];
  }

  // 抽取检查元素可见性的逻辑
  private isElementVisible(element: HTMLElement, computedStyle: CSSStyleDeclaration): boolean {
    return !(
      computedStyle.display === 'none' ||
      computedStyle.visibility === 'hidden' ||
      computedStyle.opacity === '0' ||
      element.getAttribute('data-visible') === 'false' ||
      element.getAttribute('data-hidden') === 'true' ||
      element.getAttribute('data-ignore') === 'true' ||
      element.getAttribute('hidden') === 'true'
    );
  }

  // 抽取检查元素可交互的逻辑
  private isElementInteractive(element: HTMLElement, computedStyle: CSSStyleDeclaration): boolean {
    const tagName = element.tagName;
    const isInteractiveTag =
      DOMDomainAnalyzer.INTERACTIVE_TAGS.includes(tagName) ||
      (tagName === 'INPUT' &&
        DOMDomainAnalyzer.INTERACTIVE_INPUT_TYPES.includes((element as HTMLInputElement).type)) ||
      (tagName === 'LABEL' && element.hasAttribute('for'));

    const hasInteractiveAttr =
      Boolean(element.onclick) ||
      Boolean(element.onmousedown) ||
      Boolean(element.onmouseup) ||
      Boolean(element.hasAttribute('onclick')) ||
      Boolean(element.hasAttribute('onmousedown')) ||
      Boolean(element.hasAttribute('onmouseup')) ||
      (element.hasAttribute('role') &&
        DOMDomainAnalyzer.INTERACTIVE_ROLES.includes(element.getAttribute('role') || '')) ||
      element.hasAttribute('tabindex');

    return isInteractiveTag || hasInteractiveAttr || computedStyle.cursor === 'pointer';
  }

  // 抽取检查元素可编辑的逻辑
  private isElementEditable(element: HTMLElement): boolean {
    const tagName = element.tagName;
    const isFormElement =
      ((tagName === 'INPUT' &&
        !DOMDomainAnalyzer.NON_EDITABLE_INPUT_TYPES.includes((element as HTMLInputElement).type)) ||
        tagName === 'SELECT' ||
        tagName === 'TEXTAREA') &&
      !(element.hasAttribute('readonly') || element.hasAttribute('disabled'));

    const isContentEditable =
      element.hasAttribute('contenteditable') &&
      element.getAttribute('contenteditable') !== 'false';

    return isFormElement || isContentEditable;
  }

  private traverseNode(node: Node): HTMLElement {
    // 创建元素的克隆副本
    const annotatedNode = node.cloneNode(false) as HTMLElement;

    // 如果节点是元素节点
    if (node.nodeType === DOMDomainAnalyzer.ELEMENT_NODE) {
      const htmlElement = node as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlElement);

      // 将原始元素添加到 annotatedElements 数组中
      this.annotatedElements.push(htmlElement);

      // 获取当前元素在数组中的索引
      const elementIndex = this.annotatedElements.length - 1;
      annotatedNode.setAttribute(this.annotationAttribute, elementIndex.toString());

      // 使用提取的方法简化代码
      const isVisible = this.isElementVisible(htmlElement, computedStyle);
      annotatedNode.setAttribute('data-visible', String(isVisible));

      const isInteractive = this.isElementInteractive(htmlElement, computedStyle);
      annotatedNode.setAttribute('data-interactive', String(isInteractive));

      const isEditable = this.isElementEditable(htmlElement);
      annotatedNode.setAttribute('data-editable', String(isEditable));

      if (isEditable || isInteractive) {
        this.interactiveElements.push(htmlElement);
      }

      // 保存元素的重要属性
      if (htmlElement.hasAttribute('id')) {
        annotatedNode.setAttribute('data-original-id', htmlElement.id);
      }
      if (htmlElement.hasAttribute('class')) {
        annotatedNode.setAttribute('data-original-class', htmlElement.className);
      }
      if (htmlElement.hasAttribute('name')) {
        annotatedNode.setAttribute('data-original-name', htmlElement.getAttribute('name') || '');
      }

      // 对于表单元素，保存其状态
      if (
        htmlElement.tagName === 'INPUT' ||
        htmlElement.tagName === 'TEXTAREA' ||
        htmlElement.tagName === 'SELECT'
      ) {
        const inputElement = htmlElement as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement;
        if ('value' in inputElement) {
          annotatedNode.setAttribute('data-value', inputElement.value);
        }
        if ('checked' in inputElement && typeof inputElement.checked === 'boolean') {
          annotatedNode.setAttribute('data-checked', inputElement.checked.toString());
        }
        if ('disabled' in inputElement && typeof inputElement.disabled === 'boolean') {
          annotatedNode.setAttribute('data-disabled', inputElement.disabled.toString());
        }
      }
    }

    for (const child of node.childNodes) {
      const childNode = this.traverseNode(child);
      annotatedNode.appendChild(childNode);
    }

    // 如果是文本节点或其他类型节点，直接克隆
    return annotatedNode;
  }

  private highlightInteractiveElements(): void {
    if (!this.enableHighlight) return;

    // 检查环境是否支持所需的 DOM 功能
    if (!document || !window || typeof document.createElement !== 'function') {
      console.warn('当前环境不支持 DOM 高亮功能');
      return;
    }

    // 过滤出符合条件的交互元素
    const elementsToHighlight = this.interactiveElements.filter((el) => {
      try {
        const computedStyle = window.getComputedStyle(el);
        const width = Number.parseInt(computedStyle.width, 10);
        const height = Number.parseInt(computedStyle.height, 10);
        return width >= this.minInteractiveSize && height >= this.minInteractiveSize;
      } catch (e) {
        console.warn('获取元素样式时出错', e);
        return false;
      }
    });

    // 高亮处理
    const transitionStyle = DOMDomainAnalyzer.DEFAULT_CONFIG.TRANSITION_STYLE;

    for (const el of elementsToHighlight) {
      try {
        // 保存原始样式
        const originalFilter = el.style.filter;

        // 应用高亮样式
        el.style.filter = this.highlightStyle;
        el.style.transition = transitionStyle;

        // 保存原始样式到元素上
        el.setAttribute('data-original-filter', originalFilter);
      } catch (e) {
        console.warn('应用高亮样式时出错', e);
      }
    }

    // 使用setTimeout清理样式
    setTimeout(() => {
      for (const el of elementsToHighlight) {
        try {
          // 恢复原始样式
          el.style.filter = el.getAttribute('data-original-filter') || '';
          el.removeAttribute('data-original-filter');
        } catch (e) {
          console.warn('恢复原始样式时出错', e);
        }
      }
    }, this.highlightDuration);
  }

  public getAnalyzedHTML(element?: HTMLElement): string {
    // 重置内部状态
    this.annotatedElements = [];
    this.interactiveElements = [];

    // 遍历DOM
    const analyzedDocument = this.traverseNode(element ?? document.documentElement);

    // 高亮交互元素
    this.highlightInteractiveElements();

    return analyzedDocument.outerHTML;
  }

  // 静态方法便于直接调用
  public static analyze(options?: {
    annotationAttribute?: string;
    minInteractiveSize?: number;
    highlightStyle?: string;
    highlightDuration?: number;
    enableHighlight?: boolean;
  }): string {
    const analyzer = new DOMDomainAnalyzer(options);
    return analyzer.getAnalyzedHTML();
  }
}
