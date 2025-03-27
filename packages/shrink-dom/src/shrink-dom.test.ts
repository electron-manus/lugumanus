import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { DOMContentExtractor } from './dom-content-extractor';
import { DOMDomainAnalyzer } from './dom-domain-analyzer';
import { DOMShrinker } from './shrink-dom';

describe('DOMShrinker', () => {
  // 测试基本压缩功能
  test('应该正确压缩简单HTML', () => {
    const html = '<div><p>Hello</p><p>World</p></div>';
    const result = DOMShrinker.compressHTMLString(html);

    // 确保结果包含模板定义和引用
    expect(result).toContain('T1:');
    expect(result).toContain('<p>Hello</p>');
  });

  // 测试带有属性的HTML压缩
  test('应该正确处理带有属性的HTML', () => {
    const html = `
      <div class="container">
        <button class="btn" type="button">Click me</button>
        <button class="btn" type="submit">Submit</button>
      </div>
    `;

    const result = DOMShrinker.compressHTMLString(html);

    // 确保结果包含按钮模板
    expect(result).toContain('btn');
    expect(result).toContain('button');
  });

  // 测试嵌套结构的HTML压缩
  test('应该正确处理嵌套结构', () => {
    const html = `
      <div>
        <ul>
          <li><span>Item 1</span></li>
          <li><span>Item 2</span></li>
          <li><span>Item 3</span></li>
        </ul>
      </div>
    `;

    const result = DOMShrinker.compressHTMLString(html);

    // 确保结果包含列表项模板
    expect(result).toContain('<li>');
    expect(result).toContain('<span>');
  });

  // 测试自定义配置选项
  test('应该尊重自定义配置选项', () => {
    const html = `
      <div>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
      </div>
    `;

    const result = DOMShrinker.compressHTMLString(html, {
      templateIdPrefix: 'Template',
      minTemplateOccurrences: 2,
    });

    // 确保使用了自定义前缀
    expect(result).toContain('Template1:');
  });

  // 测试复杂的真实世界HTML
  test('应该处理复杂的真实世界HTML', () => {
    const html = `
      <div class="card-container">
        <div class="card">
          <div class="card-header">
            <h3>Product 1</h3>
            <span class="price">$19.99</span>
          </div>
          <div class="card-body">
            <p>This is product 1 description</p>
            <button class="btn">Add to Cart</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3>Product 2</h3>
            <span class="price">$29.99</span>
          </div>
          <div class="card-body">
            <p>This is product 2 description</p>
            <button class="btn">Add to Cart</button>
          </div>
        </div>
      </div>
    `;

    const result = DOMShrinker.compressHTMLString(html);

    // 确保识别出卡片模板
    expect(result).toContain('card');
    expect(result).toContain('card-header');
    expect(result).toContain('card-body');
  });

  // 测试空HTML处理
  test('应该优雅地处理空HTML', () => {
    const html = '<div></div>';
    const result = DOMShrinker.compressHTMLString(html);

    // 应该返回简单的div，没有模板
    expect(result).toContain('<div></div>');
  });

  // 测试直接使用DOM元素
  test('应该支持直接使用DOM元素', () => {
    const dom = new JSDOM('<div><p>Test</p><p>Test</p></div>');
    const shrinker = new DOMShrinker();
    const result = shrinker.compressHTML(dom.window.document.body);

    // 确保结果包含模板
    expect(result).toContain('T1:');
    expect(result).toContain('<p>Test</p>');
  });

  // 测试不同的模板深度设置
  test('应该尊重最小模板深度设置', () => {
    const html = `
      <div>
        <p><span>Text 1</span></p>
        <p><span>Text 2</span></p>
      </div>
    `;

    // 使用较高的最小深度
    const result1 = DOMShrinker.compressHTMLString(html, {
      minTemplateDepth: 3,
    });

    // 使用较低的最小深度
    const result2 = DOMShrinker.compressHTMLString(html, {
      minTemplateDepth: 1,
    });

    // 结果应该不同
    expect(result1).not.toEqual(result2);
  });

  // 测试带有注释的HTML
  test('应该正确处理带有注释的HTML', () => {
    const html = `
      <div>
        <!-- 这是一个注释 -->
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
      </div>
    `;

    const result = DOMShrinker.compressHTMLString(html);

    // 确保结果包含段落模板但忽略注释
    expect(result).toContain('<p>');
    expect(result).not.toContain('这是一个注释');
  });

  // 测试带有特殊字符的HTML
  test('应该正确处理带有特殊字符的HTML', () => {
    const html = `
      <div>
        <p>特殊字符: &lt; &gt; &amp; &quot; &apos;</p>
        <p>特殊字符: &lt; &gt; &amp; &quot; &apos;</p>
      </div>
    `;

    const result = DOMShrinker.compressHTMLString(html);

    // 确保特殊字符被正确处理
    expect(result).toContain('特殊字符');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&amp;');
  });

  // 使用快照测试验证压缩结果的一致性
  test('应该生成一致的压缩输出并匹配快照', () => {
    const complexHtml = `
      <div class="article">
        <header>
          <h1>文章标题</h1>
          <div class="meta">
            <span class="author">作者名</span>
            <span class="date">2023-04-01</span>
          </div>
        </header>
        <section class="content">
          <p>第一段落内容</p>
          <p>第二段落内容</p>
          <ul class="points">
            <li>要点一</li>
            <li id="point-2" class="point">要点二</li>
            <li>要点三</li>
            <li>小节奏</li>
          </ul>
        </section>
        <footer>
          <div class="tags">
            <span class="tag2">标签1</span>
            <span class="tag">标签2</span>
            <span class="tag">标签3</span>
          </div>
          <button class="like">点赞</button>
          <button class="share">分享</button>
          <div class="link">
            <a href="https://www.xiaolugu.com">百度</a>
            <a href="https://www.baidu.com">百度</a>
          </div>
        </footer>
      </div>
    `;

    const result = DOMShrinker.compressHTMLString(complexHtml, {
      minTemplateOccurrences: 2,
      minTemplateDepth: 2,
    });

    // 使用快照测试确保压缩结果的一致性
    expect(result).toMatchSnapshot();
  });

  test('处理真实的DOM结构', async () => {
    const html = await Bun.file(path.join(import.meta.dir, 'mock/mock.html')).text();
    const dom = new JSDOM(html);
    globalThis.window = dom.window as unknown as Window & typeof globalThis;
    globalThis.document = dom.window.document;

    const analyzer = new DOMDomainAnalyzer();
    const result = analyzer.getAnalyzedHTML(dom.window.document.documentElement);
    const analyzedDOM = new JSDOM(result);

    const extractor = new DOMContentExtractor();
    const result2 = extractor.extract(analyzedDOM.window.document.documentElement);
    const extractedDOM = new JSDOM((result2 as HTMLElement)?.outerHTML);

    expect(extractedDOM).not.toBeNull();

    const shrinker = new DOMShrinker({
      minTemplateOccurrences: 1,
      minTemplateDepth: 2,
    });
    const result3 = shrinker.compressHTML(extractedDOM.window.document.body);
    expect(result3).toMatchSnapshot();
  });
});
