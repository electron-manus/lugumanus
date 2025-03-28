import { beforeEach, describe, expect, it } from 'bun:test';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { DOMContentExtractor } from './dom-content-extractor';
import { DOMDomainAnalyzer } from './dom-domain-analyzer';

describe('DOMContentExtractor', () => {
  let extractor: DOMContentExtractor;
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    extractor = new DOMContentExtractor();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    global.window = dom.window as unknown as Window & typeof globalThis;
    global.document = dom.window.document;
  });

  // 辅助函数：创建测试DOM
  function createTestElement(html: string): ChildNode {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container.firstChild as ChildNode;
  }

  describe('基本提取功能', () => {
    it('验证提取器能够正确提取简单文本节点', () => {
      const textNode = document.createTextNode('测试文本');
      const result = extractor.extract(textNode);

      expect(result).not.toBeNull();
      expect(result?.textContent?.trim()).toBe('测试文本');
    });

    it('应该跳过空元素', () => {
      const element = createTestElement("<div data-visible='true'></div>");
      const result = extractor.extract(element);

      expect(result).toBeNull();
    });
  });

  describe('元素筛选功能', () => {
    it('应该跳过图片元素', () => {
      const element = createTestElement("<img src='test.jpg' alt='测试图片' data-visible='true'/>");
      const result = extractor.extract(element);

      expect(result).toBeNull();
    });

    it('应该跳过不可见元素', () => {
      const element = createTestElement('<div>不可见内容</div>');
      const result = extractor.extract(element);

      expect(result).toBeNull();
    });

    it('应该保留表单元素', () => {
      for (const tag of DOMContentExtractor.FORM_ELEMENT_TAGS) {
        const element = createTestElement(
          `<${tag.toLowerCase()} data-visible='true' name='test'></${tag.toLowerCase()}>`,
        );
        const result = extractor.extract(element);

        expect(result).not.toBeNull();
        expect((result as HTMLElement).tagName).toBe(tag);
      }
    });

    it('应该处理强调标签并保留其文本', () => {
      const element = createTestElement("<strong data-visible='true'>重要文本</strong>");
      const result = extractor.extract(element);

      expect(result).not.toBeNull();
      expect(result?.textContent?.trim()).toBe('重要文本');
    });
  });

  describe('属性处理功能', () => {
    it('应该保留指定的HTML属性', () => {
      const element = createTestElement(
        "<button data-visible='true' type='submit' name='submit-btn' title='提交按钮'>提交</button>",
      );
      const result = extractor.extract(element) as HTMLElement;

      expect(result).not.toBeNull();
      for (const attr of DOMContentExtractor.PRESERVED_ATTRIBUTES) {
        if ((element as HTMLElement).hasAttribute(attr)) {
          expect(result.hasAttribute(attr)).toBe(true);
          expect(result.getAttribute(attr)).toBe((element as HTMLElement).getAttribute(attr));
        }
      }
    });

    it('不应保留非指定的HTML属性', () => {
      const element = createTestElement(
        `<div data-visible='true'>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容1</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容2</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容3</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容4</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容5</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容6</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容7</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容8</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容9</div>
            <div data-visible='true' class='test' style='color:red' data-custom='value'>内容10</div>
        </div>`,
      );
      const result = extractor.extract(element) as HTMLElement;

      expect(result).not.toBeNull();
      expect(result.hasAttribute('class')).toBe(false);
      expect(result.hasAttribute('style')).toBe(false);
      expect(result.hasAttribute('data-custom')).toBe(false);
    });
  });

  describe('内容有意义的判断', () => {
    it('应该判断有意义的内容', () => {
      const html = `<div data-visible='true'>
          <h1 data-visible='true' data-interactive='true'>标题</h1>
          <p data-visible='true' data-interactive='true'>段落1<strong>强调</strong></p>
          <p data-visible='true' data-interactive='true'>段落2<strong>强调</strong></p>
          <ul data-visible='true'>
            <li data-visible='true' data-interactive='true'>列表项1</li>
            <li data-visible='true' data-interactive='true'>列表项2</li>
          </ul>
          <form data-visible='true' data-interactive='true'>
            <input data-visible='true' type='text' name='name' data-interactive='true' placeholder='姓名'>
            <button data-visible='true' type='submit' data-interactive='true'>提交</button>
          </form>
        </div>
      `;
      const element = createTestElement(html);
      const extractedContent = extractor.extract(element);

      expect(extractedContent).not.toBeNull();
      expect(extractor.isContentMeaningful(extractedContent as ChildNode)).toBe(true);
    });

    it('应该判断无意义的内容', () => {
      const html = `<span data-visible='true'>单一短文本</span>`;
      const element = createTestElement(html);
      const extractedContent = extractor.extract(element);

      expect(extractedContent).not.toBeNull();
      expect(extractor.isContentMeaningful(extractedContent as ChildNode)).toBe(false);
    });
  });

  describe('跳过特定内容', () => {
    it('应该跳过广告内容', () => {
      const adElement = createTestElement(
        "<div data-visible='true' class='advertisement'>广告内容</div>",
      );
      const result = extractor.extract(adElement);

      expect(result).toBeNull();
    });

    it('应该跳过页脚版权信息', () => {
      const footerElement = createTestElement(
        "<footer data-visible='true'>© 2023 版权所有</footer>",
      );
      const result = extractor.extract(footerElement);

      expect(result).toBeNull();
    });

    it('应该跳过隐私政策相关内容', () => {
      const element = createTestElement("<div data-visible='true'>隐私政策和使用条款</div>");
      const result = extractor.extract(element);

      expect(result).toBeNull();
    });
  });

  describe('自定义配置', () => {
    it('应该使用自定义的跳过关键词', () => {
      const customExtractor = new DOMContentExtractor({
        skipKeywords: ['测试关键词'],
      });

      const element = createTestElement("<div data-visible='true'>包含测试关键词的内容</div>");
      const result = customExtractor.extract(element);

      expect(result).toBeNull();
    });

    it('应该使用自定义的保留属性', () => {
      const customExtractor = new DOMContentExtractor({
        preservedAttributes: ['data-test'],
      });

      const element = createTestElement(
        "<div data-visible='true' data-test='value' name='test'>内容</div>",
      );
      const result = customExtractor.extract(element) as HTMLElement;

      expect(result).not.toBeNull();
      expect(result.hasAttribute('data-test')).toBe(true);
      expect(result.hasAttribute('name')).toBe(false);
    });
  });

  describe('性能测试', () => {
    it('应该处理大量节点', async () => {
      const html = await Bun.file(path.join(import.meta.dir, './mock/mock.html')).text();
      const dom = new JSDOM(html);
      const analyzer = new DOMDomainAnalyzer();
      const analyzedHtml = analyzer.getAnalyzedHTML(dom.window.document.documentElement);
      const compactHtml = extractor.extractCompactString(analyzedHtml);

      expect(compactHtml).not.toBeNull();
      expect(compactHtml).toMatchSnapshot();
    });
  });
});
