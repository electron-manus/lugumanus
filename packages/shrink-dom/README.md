# shrink-dom

一个用于 DOM 树分析、压缩和内容提取的工具库。

[English](./docs/README.en.md) | [日本語](./docs/README.ja.md) | [繁體中文](./docs/README.zh-TW.md)

## 功能特点

- **DOM 分析**：使用 `DOMDomainAnalyzer` 分析 DOM 树，标记元素的可见性、交互性和可编辑性
- **DOM 压缩**：使用 `DOMShrinker` 压缩 HTML 结构，识别重复模式并生成模板化表示
- **内容提取**：使用 `DOMContentExtractor` 从 DOM 中提取有意义的内容，过滤广告和无关信息

## 安装

```bash
# 使用 npm
npm install shrink-dom

# 使用 yarn
yarn add shrink-dom

# 使用 bun
bun add shrink-dom
```


## 使用方法

### DOM 分析

```typescript
import { DOMDomainAnalyzer } from 'shrink-dom';

// 在浏览器环境中分析当前页面
const analyzedHTML = DOMDomainAnalyzer.analyze();
console.log(analyzedHTML);

// 使用自定义配置
const analyzer = new DOMDomainAnalyzer({
  annotationAttribute: 'data-custom-id',
  enableHighlight: true,
  highlightDuration: 1000
});
const result = analyzer.getAnalyzedHTML();
```


### DOM 压缩

```typescript
import { DOMShrinker } from 'shrink-dom';

// 压缩 HTML 字符串
const html = `
  <div class="card">
    <h2>标题1</h2>
    <p>内容1</p>
  </div>
  <div class="card">
    <h2>标题2</h2>
    <p>内容2</p>
  </div>
`;
const compressed = DOMShrinker.compressHTMLString(html);
console.log(compressed);

// 使用自定义配置
const shrinker = new DOMShrinker({
  minTemplateDepth: 3,
  minTemplateOccurrences: 3,
  templateIdPrefix: 'Template'
});
const result = shrinker.compressHTML(document.body);
```


### 内容提取

```typescript
import { DOMContentExtractor } from 'shrink-dom';

// 创建提取器实例
const extractor = new DOMContentExtractor();

// 提取内容
const extractedContent = extractor.extract(document.body);
if (extractedContent && extractor.isContentMeaningful(extractedContent)) {
  console.log('提取到有意义的内容:', extractedContent.outerHTML);
}

// 使用自定义配置
const customExtractor = new DOMContentExtractor({
  skipKeywords: ['广告', '赞助'],
  preservedAttributes: ['data-id', 'title', 'aria-label']
});
```


## API 参考

### DOMDomainAnalyzer

分析 DOM 树并标记元素的特性。

```typescript
// 配置选项
interface DOMDomainAnalyzerOptions {
  annotationAttribute?: string;  // 默认: 'data-xgl-id'
  minInteractiveSize?: number;   // 默认: 20
  highlightStyle?: string;       // 默认: 'brightness(1.2) contrast(1.1)'
  highlightDuration?: number;    // 默认: 500
  enableHighlight?: boolean;     // 默认: true
}

// 静态方法
DOMDomainAnalyzer.analyze(options?: DOMDomainAnalyzerOptions): string;

// 实例方法
new DOMDomainAnalyzer(options?: DOMDomainAnalyzerOptions);
analyzer.getAnalyzedHTML(): string;
```


### DOMShrinker

压缩 HTML 结构，识别重复模式。

```typescript
// 配置选项
interface DOMShrinkerOptions {
  minTemplateDepth?: number;       // 默认: 2
  minTemplateOccurrences?: number; // 默认: 2
  templateIdPrefix?: string;       // 默认: 'T'
}

// 静态方法
DOMShrinker.compressHTMLString(html: string, options?: DOMShrinkerOptions): string;

// 实例方法
new DOMShrinker(options?: DOMShrinkerOptions);
shrinker.compressHTML(document: Document | Element): string;
```


### DOMContentExtractor

从 DOM 中提取有意义的内容。

```typescript
// 配置选项
interface ExtractorOptions {
  skipKeywords?: string[];        // 要跳过的关键词
  preservedAttributes?: string[]; // 要保留的属性
  formElementTags?: string[];     // 表单元素标签
  emphasisTags?: string[];        // 强调元素标签
  briefTextThreshold?: number;    // 简短文本阈值
}

// 实例方法
new DOMContentExtractor(options?: ExtractorOptions);
extractor.extract(element: ChildNode): ChildNode | null;
extractor.isContentMeaningful(element: ChildNode): boolean;
```


## 开发

```bash
# 安装依赖
bun install

# 运行测试
bun test

# 构建
bun run build
```


## 许可证

MIT
