import type { DOMWindow } from 'jsdom';
import { JSDOM } from 'jsdom';
import type { ExtractorOptions } from './types';

/**
 * 内容提取器类，用于从DOM中提取关键内容
 */
export class DOMContentExtractor {
  /**
   * 默认值常量
   */
  static readonly FORM_ELEMENT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'OPTION', 'LABEL'];

  static readonly PRESERVED_ATTRIBUTES = [
    'aria-label',
    'data-name',
    'name',
    'type',
    'placeholder',
    'value',
    'role',
    'title',
    'for',
  ];

  static readonly EMPHASIS_TAGS = [
    'EM',
    'STRONG',
    'B',
    'I',
    'MARK',
    'SMALL',
    'DEL',
    'INS',
    'SUB',
    'SUP',
  ];

  static readonly BRIEF_TEXT_THRESHOLD = 200;

  static readonly SKIP_KEYWORDS = [
    'copyright',
    '©',
    'all rights reserved',
    '版权所有',
    '隐私政策',
    'privacy policy',
    '使用条款',
    'terms of service',
    'terms of use',
    'terms and conditions',
    'cookie',
    'cookies政策',
    '广告',
    'advertisement',
    'sponsored',
    '赞助',
    'ad',
    'ads',
    'promotion',
  ];

  private jsdomInstance: JSDOM;
  private documentNode: Document;
  private readonly nodeType: DOMWindow['Node'];

  // 用于高效查询的缓存集合
  private readonly formElementTags: Set<string>;
  private readonly preservedAttributes: string[];
  private readonly preservedAttributesSet: Set<string>;
  private readonly emphasisTags: Set<string>;

  // 需要跳过的关键词
  private readonly skipKeywords: string[];

  // 标签名映射表 - 将长标签名映射为简短版本
  private readonly tagNameMap: Record<string, string> = {
    BUTTON: 'btn',
    TEXTAREA: 'txt',
    PARAGRAPH: 'p',
    SECTION: 'sec',
    ARTICLE: 'art',
    HEADER: 'hdr',
    FOOTER: 'ftr',
    NAVIGATION: 'nav',
    CONTAINER: 'cnt',
    DIV: 'd',
    SPAN: 'spn',
    A: 'a',
    UL: 'ul',
    OL: 'ol',
    LI: 'li',
    TABLE: 'tbl',
    TR: 'tr',
    TD: 'td',
    TH: 'th',
    FORM: 'frm',
    IFRAME: 'ifr',
    INPUT: 'inp',
    SELECT: 'sel',
    OPTION: 'opt',
    LABEL: 'lbl',
    FIELDSET: 'fset',
    MAIN: 'main',
    ASIDE: 'asd',
    FIGURE: 'fig',
    FIGCAPTION: 'fcap',
    BLOCKQUOTE: 'bq',
    CODE: 'code',
    PRE: 'pre',
    DETAILS: 'dtl',
    SUMMARY: 'smry',
    CANVAS: 'cnv',
    VIDEO: 'vid',
    AUDIO: 'aud',
    SOURCE: 'src',
    IMG: 'img',
    // 可以添加更多标签名映射
  };

  /**
   * 创建内容提取器实例
   * @param options 配置选项
   */
  constructor(options: ExtractorOptions = {}) {
    // 创建一个全局JSDOM实例，避免重复创建
    this.jsdomInstance = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    this.documentNode = this.jsdomInstance.window.document;
    this.nodeType = this.jsdomInstance.window.Node;

    // 设置默认值和用户自定义值
    this.formElementTags = new Set(
      options.formElementTags || DOMContentExtractor.FORM_ELEMENT_TAGS,
    );
    this.preservedAttributes =
      options.preservedAttributes || DOMContentExtractor.PRESERVED_ATTRIBUTES;
    this.preservedAttributesSet = new Set(this.preservedAttributes);
    this.emphasisTags = new Set(options.emphasisTags || DOMContentExtractor.EMPHASIS_TAGS);
    this.skipKeywords = options.skipKeywords || DOMContentExtractor.SKIP_KEYWORDS;
  }

  /**
   * 提取简化的DOM内容
   * @param element 需要处理的DOM节点
   * @returns 提取后的DOM节点或null
   */
  public extract(element: ChildNode): ChildNode | null {
    return this.transformNode(element, false);
  }

  /**
   * 提取极度紧凑的DOM内容
   * @param element 需要处理的DOM节点
   * @returns 提取后的紧凑DOM节点或null
   */
  public extractCompact(element: ChildNode): ChildNode | null {
    return this.transformNode(element, false);
  }

  /**
   * 提取极度紧凑的DOM内容
   * @param element 需要处理的DOM节点
   * @returns 提取后的紧凑DOM节点或null
   */
  public extractCompactString(element: string) {
    const dom = new JSDOM(element);
    if (!dom.window.document.documentElement) {
      throw new Error('DOM is not valid');
    }

    const result = this.extractCompact(dom.window.document.documentElement);
    return (result as HTMLElement)?.outerHTML ?? '';
  }

  /**
   * 检查提取的内容是否有意义
   * @param element 提取后的DOM节点
   * @returns 是否有意义
   */
  public isContentMeaningful(element: ChildNode): boolean {
    // 如果节点为空，返回 false
    if (!element) return false;

    // 收集所有节点进行分析
    const allNodes: ChildNode[] = [];

    // 深度优先搜索收集所有节点
    const collectNodes = (node: ChildNode): void => {
      allNodes.push(node);

      // 如果是元素节点，递归处理其子节点
      if (this.isElementNode(node)) {
        const children = Array.from((node as HTMLElement).childNodes);
        for (const child of children) {
          collectNodes(child);
        }
      }
    };

    collectNodes(element);

    // 如果有效节点总数太少，认为无效
    if (allNodes.length < 10) return false;

    // 计算文本节点和元素节点的数量
    const textNodes = allNodes.filter((node) => this.isTextNode(node));
    const elementNodes = allNodes.filter((node) => this.isElementNode(node));

    // 检查条件：
    // 1. 如果所有节点都是文本节点，认为无效
    if (textNodes.length === allNodes.length) return false;

    // 2. 如果所有节点都是元素节点且没有文本内容，认为无效
    if (
      elementNodes.length === allNodes.length &&
      !allNodes.some((node) => node.textContent?.trim())
    ) {
      return false;
    }

    // 通过所有检查，认为有效
    return true;
  }

  /**
   * 转换DOM节点
   * @param element 需要处理的DOM节点
   * @returns 处理后的DOM节点或null
   * @private
   */
  private transformNode(element: ChildNode, compact: boolean): ChildNode | null {
    // 处理文本节点
    if (this.isTextNode(element)) {
      const text = element.textContent?.trim();
      return text ? this.documentNode.createTextNode(`${text} `) : null;
    }

    const type = Object.prototype.toString.call(element);
    if (!/HTML.*Element/.test(type)) {
      return null;
    }

    const htmlElement = element as HTMLElement;
    const tagName = htmlElement.tagName;

    // 快速剔除条件检查
    if (this.shouldSkipBasedOnTag(htmlElement, tagName)) {
      return null;
    }

    // 处理行内强调元素，只保留文本内容
    if (this.emphasisTags.has(tagName)) {
      const textContent = htmlElement.textContent?.trim();
      return textContent ? this.documentNode.createTextNode(`${textContent} `) : null;
    }

    // Copyright 和 隐私政策等等节点也可以认为无效节点
    if (this.shouldSkipElement(htmlElement)) {
      return null;
    }

    // 批量处理子节点
    const processedChildren = this.processChildNodes(htmlElement, tagName, compact);

    // 如果子节点为空且不是表单元素，则不保留
    if (processedChildren.length === 0 && !this.formElementTags.has(tagName)) {
      return null;
    }

    // 合并检查条件
    const shouldKeepElement = this.shouldKeepElement(htmlElement);

    // 快速决定路径
    if (!shouldKeepElement && processedChildren.length === 1) {
      return processedChildren[0] ?? null;
    }

    // 创建并配置新容器
    return this.createContainerWithAttributes(htmlElement, tagName, processedChildren, compact);
  }

  // 辅助方法：判断节点类型
  private isTextNode(node: ChildNode): boolean {
    return node.nodeType === this.nodeType.TEXT_NODE;
  }

  private isElementNode(node: ChildNode): boolean {
    return node.nodeType === this.nodeType.ELEMENT_NODE;
  }

  // 辅助方法：基于标签快速判断是否应该跳过
  private shouldSkipBasedOnTag(element: HTMLElement, tagName: string): boolean {
    // 如果是图片，则不保留
    if (tagName === 'IMG') {
      return true;
    }

    // 检查元素是否可见
    if (element.getAttribute('data-visible') !== 'true') {
      return true;
    }

    // 跳过广告内容
    if (this.isAdvertisement(element)) {
      return true;
    }

    // 优化空节点检查
    if (element.childNodes.length === 0 && !this.formElementTags.has(tagName)) {
      return true;
    }

    return false;
  }

  // 检查元素是否是广告
  private isAdvertisement(element: HTMLElement): boolean {
    // 检查类名
    const className = element.className.toLowerCase();
    if (
      className &&
      /\b(ad|ads|advert|advertisement|banner|sponsor|sponsored|promotion)\b/.test(className)
    ) {
      return true;
    }

    // 检查ID
    const id = element.id.toLowerCase();
    if (id && /\b(ad|ads|advert|advertisement|banner|sponsor|sponsored|promotion)\b/.test(id)) {
      return true;
    }

    // 检查广告相关属性
    if (
      element.hasAttribute('data-ad') ||
      element.hasAttribute('data-sponsored') ||
      element.getAttribute('data-ad-client') ||
      element.getAttribute('aria-label')?.toLowerCase().includes('广告')
    ) {
      return true;
    }

    return false;
  }

  // 辅助方法：处理子节点
  private processChildNodes(element: HTMLElement, tagName: string, compact: boolean): ChildNode[] {
    const childNodes = element.childNodes;
    const childrenLength = childNodes.length;
    const processedChildren: ChildNode[] = [];

    // 手动循环比map/filter更高效
    for (let i = 0; i < childrenLength; i++) {
      const childNode = childNodes[i];
      if (childNode) {
        const result = this.transformNode(childNode, compact);
        if (result) processedChildren.push(result);
      }
    }

    // 对于body标签的特殊处理
    if (tagName === 'BODY') {
      let j = 0;
      while (j < processedChildren.length) {
        const child = processedChildren[j];
        if (child && this.isTextNode(child)) {
          processedChildren.splice(j, 1);
        } else {
          j++;
        }
      }
    }

    return processedChildren;
  }

  // 辅助方法：判断是否应该保留元素
  private shouldKeepElement(element: HTMLElement): boolean {
    const isInteractive =
      element.getAttribute('data-interactive') === 'true' || element.hasAttribute('role');
    const isEditable = element.getAttribute('data-editable') === 'true';
    const hasLabel = element.hasAttribute('aria-label') || element.hasAttribute('name');
    return isInteractive || hasLabel || isEditable;
  }

  // 辅助方法：创建带属性的容器
  private createContainerWithAttributes(
    htmlElement: HTMLElement,
    tagName: string,
    processedChildren: ChildNode[],
    compact = false,
  ): HTMLElement {
    // 使用简化的标签名
    const shortTagName = compact
      ? this.tagNameMap[tagName] || tagName.toLowerCase()
      : tagName.toLowerCase();
    const container = this.documentNode.createElement(shortTagName);
    const elementText = htmlElement.textContent?.trim() || '';

    // 预先检查是否存在title和aria-label，并且它们的值相同
    const titleValue = htmlElement.getAttribute('title');
    const ariaLabelValue = htmlElement.getAttribute('aria-label');
    const titleEqualsAriaLabel = titleValue && ariaLabelValue && titleValue === ariaLabelValue;

    // 获取属性名列表
    const attrNames = htmlElement.getAttributeNames();

    if (!compact) {
      for (let i = 0; i < attrNames.length; i++) {
        const attr = attrNames[i];
        if (attr && this.preservedAttributesSet.has(attr)) {
          const attrValue = htmlElement.getAttribute(attr) as string;

          // 跳过与文本内容相同的title和aria-label
          if ((attr === 'title' || attr === 'aria-label') && attrValue === elementText) {
            continue;
          }

          // 如果title和aria-label值相同，只保留aria-label
          if (titleEqualsAriaLabel && attr === 'title') {
            continue;
          }

          // 使用简化的属性名
          const shortAttrName = attr;
          container.setAttribute(shortAttrName, attrValue);
        }
      }
    }

    // 处理特殊属性，使用更短的属性名
    const isInteractive =
      htmlElement.getAttribute('data-interactive') === 'true' || htmlElement.hasAttribute('role');
    const isEditable = htmlElement.getAttribute('data-editable') === 'true';

    if (isInteractive || isEditable) {
      const dataId =
        htmlElement.getAttribute('data-id') || htmlElement.getAttribute('data-element-id');
      if (dataId) container.setAttribute('id', dataId);
      if (!compact) {
        if (isEditable) container.setAttribute('editable', 'true'); // 缩短 editable 为 ed
      }
    }

    // 批量添加子节点
    for (let i = 0; i < processedChildren.length; i++) {
      const child = processedChildren[i];
      if (child) {
        container.appendChild(child);
      }
    }

    return container;
  }

  /**
   * 检测节点是否应该被跳过
   * @param element HTML元素
   * @returns 是否应该被跳过
   * @private
   */
  private shouldSkipElement(element: HTMLElement): boolean {
    // 只检查直接文本节点，不包括子元素的文本
    const directText = this.getDirectTextContent(element).toLowerCase();

    // 只有当直接文本内容包含关键词时才跳过
    if (directText && this.containsAnyKeyword(directText, this.skipKeywords)) {
      return true;
    }

    return false;
  }

  /**
   * 获取元素的直接文本内容（不包括子元素的文本）
   * @param element HTML元素
   * @returns 直接文本内容
   * @private
   */
  private getDirectTextContent(element: HTMLElement): string {
    let directText = '';
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];
      if (this.isTextNode(node)) {
        directText += node.textContent || '';
      }
    }
    return directText.trim();
  }

  /**
   * 检查文本是否包含关键词列表中的任一关键词
   * @param text 要检查的文本
   * @param keywords 关键词列表
   * @returns 是否包含关键词
   * @private
   */
  private containsAnyKeyword(text: string, keywords: readonly string[]): boolean {
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      if (keyword && text.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    return false;
  }
}
