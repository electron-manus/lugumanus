import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';
import { DOMDomainAnalyzer } from './dom-domain-analyzer';

type Global = typeof globalThis & {
  window: Window;
  document: Document;
};

describe('DOMDomainAnalyzer', () => {
  let dom: JSDOM;
  let originalWindow: Global['window'] | undefined;
  let originalDocument: Global['document'] | undefined;

  beforeEach(() => {
    // 保存原始的全局变量
    originalWindow = global.window as Global['window'] | undefined;
    originalDocument = global.document as Global['document'] | undefined;

    // 创建新的 JSDOM 实例
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>测试页面</title>
        </head>
        <body>
          <div id="container">
            <button id="btn1">点击我</button>
            <a href="#" id="link1">链接</a>
            <input type="text" id="input1" value="测试输入">
            <input type="checkbox" id="checkbox1">
            <div id="hidden-div" style="display: none;">隐藏元素</div>
            <div id="pointer-div" style="cursor: pointer;">可点击元素</div>
            <div id="regular-div">普通元素</div>
            <label for="input1">输入标签</label>
            <textarea id="textarea1">文本区域</textarea>
            <div id="editable-div" contenteditable="true">可编辑内容</div>
          </div>
        </body>
      </html>
    `);

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

  test('getAnalyzedHTML 应该返回带注释的 HTML', () => {
    // 创建分析器实例
    const analyzer = new DOMDomainAnalyzer();

    // 获取分析后的 HTML
    const analyzedHTML = analyzer.getAnalyzedHTML();

    // 验证基本结构
    expect(analyzedHTML).toContain('<html');

    // 验证元素被正确注释
    expect(analyzedHTML).toContain(`data-interactive="true"`);
    expect(analyzedHTML).toContain(`data-editable="true"`);
    expect(analyzedHTML).toContain(`data-visible="true"`);
    expect(analyzedHTML).toContain(`data-original-id="`);
  });

  test('静态方法 analyze 应该返回带注释的 HTML', () => {
    // 直接调用静态方法
    const analyzedHTML = DOMDomainAnalyzer.analyze();

    // 验证基本结构
    expect(analyzedHTML).toContain('<html');

    // 验证元素被正确注释
    expect(analyzedHTML).toContain(`data-interactive="true"`);
    expect(analyzedHTML).toContain(`data-editable="true"`);
    expect(analyzedHTML).toContain(`data-visible="true"`);
    expect(analyzedHTML).toContain(`data-original-id="`);
  });

  test('可以通过选项自定义注释属性', () => {
    // 创建使用自定义注释属性的分析器
    const customAttributeName = 'data-custom-id';
    const analyzer = new DOMDomainAnalyzer({
      annotationAttribute: customAttributeName,
    });

    // 获取分析后的 HTML
    const analyzedHTML = analyzer.getAnalyzedHTML();
    const dom = new JSDOM(analyzedHTML);
    const document = dom.window.document;

    // 验证自定义属性被设置在文档元素上
    const button = document.getElementById('btn1');
    expect(button).not.toBeNull();
    expect(button?.hasAttribute(customAttributeName)).toBe(true);
  });

  test('互动元素应被正确识别', () => {
    // 创建分析器
    const analyzer = new DOMDomainAnalyzer();

    // 获取分析后的 HTML
    const analyzedHTML = analyzer.getAnalyzedHTML();
    const dom = new JSDOM(analyzedHTML);
    const document = dom.window.document;

    // 检查按钮元素
    const analyzedButton = document.querySelector('[data-element-id]#btn1');
    expect(analyzedButton).not.toBeNull();

    // 检查链接元素
    const analyzedLink = document.querySelector('[data-element-id]#link1');
    expect(analyzedLink).not.toBeNull();

    // 检查输入框
    const analyzedInput = document.querySelector('[data-element-id]#input1');
    expect(analyzedInput).not.toBeNull();

    // 检查带有指针样式的 div
    const pointerDiv = document.querySelector('[data-element-id]#pointer-div');
    expect(pointerDiv).not.toBeNull();
  });

  test('getAnalyzedHTML 输出应符合快照', () => {
    // 创建一个具有确定性配置的分析器
    const analyzer = new DOMDomainAnalyzer({
      enableHighlight: false, // 禁用高亮以避免异步行为
    });

    // 获取分析后的 HTML
    const analyzedHTML = analyzer.getAnalyzedHTML();

    // 移除可能因平台差异而变化的空白符
    const normalizedHTML = analyzedHTML.replace(/\s+/g, ' ').trim();

    // 使用快照测试验证输出
    expect(normalizedHTML).toMatchSnapshot();
  });

  test('高亮功能应该在测试环境中不会抛出错误', () => {
    // 创建分析器，启用高亮
    const analyzer = new DOMDomainAnalyzer({
      enableHighlight: true,
      highlightDuration: 0, // 使用 0 毫秒确保同步执行
    });

    // 应该能顺利执行而不抛出错误
    expect(() => {
      analyzer.getAnalyzedHTML();
    }).not.toThrow();
  });

  test('分析器应该正确标记可编辑元素的快照', () => {
    // 创建分析器实例
    const analyzer = new DOMDomainAnalyzer({
      enableHighlight: false, // 禁用高亮以确保一致性
    });

    const analyzedHTML = analyzer.getAnalyzedHTML();
    expect(analyzedHTML).toMatchSnapshot();
  });
});
