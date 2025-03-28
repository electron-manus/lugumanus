import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { DOMContentExtractor } from './dom-content-extractor';
import { DOMDomainAnalyzer } from './dom-domain-analyzer';
import { HTMLTemplateProcessor } from './templatize';

type Global = typeof globalThis & {
  window: Window;
  document: Document;
};

describe('DOMDomainAnalyzer', () => {
  let dom: JSDOM;
  let originalWindow: Global['window'] | undefined;
  let originalDocument: Global['document'] | undefined;

  beforeEach(async () => {
    // 保存原始的全局变量
    originalWindow = global.window as Global['window'] | undefined;
    originalDocument = global.document as Global['document'] | undefined;

    const html = await Bun.file(path.join(import.meta.dirname, './mock/mock2.html')).text();

    // 创建新的 JSDOM 实例
    dom = new JSDOM(html);

    // 设置全局变量
    global.window = dom.window as unknown as Window & typeof globalThis;
    global.document = dom.window.document;

    // 模拟 window.getComputedStyle
    global.window.getComputedStyle = (element: Element) => {
      const style = {} as CSSStyleDeclaration;

      // 为测试元素设置默认样式
      style.display = 'block';
      style.visibility = 'visible';
      style.opacity = '1';
      style.width = '100';
      style.height = '50';
      style.cursor = 'default';

      // 为特定元素设置特殊样式
      if (element.id === 'hidden-div') {
        style.display = 'none';
      }

      if (element.id === 'pointer-div') {
        style.cursor = 'pointer';
      }

      return style;
    };

    // 确保 Element.prototype 上有 style 属性的所有需要的方法
    if (typeof Element !== 'undefined' && Element.prototype) {
      // 扩展 Element.prototype.style 以支持所有需要的属性
      Object.defineProperty(Element.prototype, 'style', {
        get: function () {
          if (!this._style) {
            this._style = {
              filter: '',
              transition: '',
              setProperty: function (prop: string, value: string) {
                this[prop] = value;
              },
              getPropertyValue: function (prop: string) {
                return this[prop] || '';
              },
            };
          }
          return this._style;
        },
        configurable: true,
      });
    }
  });

  afterEach(() => {
    // 恢复原始全局变量
    global.window = originalWindow as Global['window'];
    global.document = originalDocument as Global['document'];
  });

  test('模板化', () => {
    // 创建分析器实例
    const analyzer = new DOMDomainAnalyzer({
      enableHighlight: false, // 禁用高亮以确保一致性
    });
    const analyzedHTML = analyzer.getAnalyzedHTML();

    const analyzedDOM = new JSDOM(analyzedHTML);
    const domContentExtractor = new DOMContentExtractor();
    const domContent = domContentExtractor.extract(analyzedDOM.window.document.body);

    const htmlTemplateProcessor = new HTMLTemplateProcessor();
    const processedHTML = htmlTemplateProcessor.processHTML((domContent as HTMLElement).outerHTML);

    expect(processedHTML).toMatchSnapshot();
  });
});
