# shrink-dom

一個用於 DOM 樹分析、壓縮和內容提取的工具庫。

[简体中文](../README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

## 功能特點

- **DOM 分析**：使用 `DOMDomainAnalyzer` 分析 DOM 樹，標記元素的可見性、互動性和可編輯性
- **DOM 壓縮**：使用 `DOMShrinker` 壓縮 HTML 結構，識別重複模式並生成模板化表示
- **內容提取**：使用 `DOMContentExtractor` 從 DOM 中提取有意義的內容，過濾廣告和無關信息

## 安裝

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

// 在瀏覽器環境中分析當前頁面
const analyzedHTML = DOMDomainAnalyzer.analyze();
console.log(analyzedHTML);

// 使用自定義配置
const analyzer = new DOMDomainAnalyzer({
  annotationAttribute: 'data-custom-id',
  enableHighlight: true,
  highlightDuration: 1000
});
const result = analyzer.getAnalyzedHTML();
```

### DOM 壓縮

```typescript
import { DOMShrinker } from 'shrink-dom';

// 壓縮 HTML 字符串
const html = `
  <div class="card">
    <h2>標題1</h2>
    <p>內容1</p>
  </div>
  <div class="card">
    <h2>標題2</h2>
    <p>內容2</p>
  </div>
`;
const compressed = DOMShrinker.compressHTMLString(html);
console.log(compressed);

// 使用自定義配置
const shrinker = new DOMShrinker({
  minTemplateDepth: 3,
  minTemplateOccurrences: 3,
  templateIdPrefix: 'Template'
});
const result = shrinker.compressHTML(document.body);
```

### 內容提取

```typescript
import { DOMContentExtractor } from 'shrink-dom';

// 創建提取器實例
const extractor = new DOMContentExtractor();

// 提取內容
const extractedContent = extractor.extract(document.body);
if (extractedContent && extractor.isContentMeaningful(extractedContent)) {
  console.log('提取到有意義的內容:', extractedContent.outerHTML);
}

// 使用自定義配置
const customExtractor = new DOMContentExtractor({
  skipKeywords: ['廣告', '贊助'],
  preservedAttributes: ['data-id', 'title', 'aria-label']
});
```

## API 參考

### DOMDomainAnalyzer

分析 DOM 樹並標記元素的特性。

```typescript
// 配置選項
interface DOMDomainAnalyzerOptions {
  annotationAttribute?: string;  // 默認: 'data-xgl-id'
  minInteractiveSize?: number;   // 默認: 20
  highlightStyle?: string;       // 默認: 'brightness(1.2) contrast(1.1)'
  highlightDuration?: number;    // 默認: 500
  enableHighlight?: boolean;     // 默認: true
}

// 靜態方法
DOMDomainAnalyzer.analyze(options?: DOMDomainAnalyzerOptions): string;

// 實例方法
new DOMDomainAnalyzer(options?: DOMDomainAnalyzerOptions);
analyzer.getAnalyzedHTML(): string;
```

### DOMShrinker

壓縮 HTML 結構，識別重複模式。

```typescript
// 配置選項
interface DOMShrinkerOptions {
  minTemplateDepth?: number;       // 默認: 2
  minTemplateOccurrences?: number; // 默認: 2
  templateIdPrefix?: string;       // 默認: 'T'
}

// 靜態方法
DOMShrinker.compressHTMLString(html: string, options?: DOMShrinkerOptions): string;

// 實例方法
new DOMShrinker(options?: DOMShrinkerOptions);
shrinker.compressHTML(document: Document | Element): string;
```

### DOMContentExtractor

從 DOM 中提取有意義的內容。

```typescript
// 配置選項
interface ExtractorOptions {
  skipKeywords?: string[];        // 要跳過的關鍵詞
  preservedAttributes?: string[]; // 要保留的屬性
  formElementTags?: string[];     // 表單元素標籤
  emphasisTags?: string[];        // 強調元素標籤
  briefTextThreshold?: number;    // 簡短文本閾值
}

// 實例方法
new DOMContentExtractor(options?: ExtractorOptions);
extractor.extract(element: ChildNode): ChildNode | null;
extractor.isContentMeaningful(element: ChildNode): boolean;
```

## 開發

```bash
# 安裝依賴
bun install

# 運行測試
bun test

# 構建
bun run build
```

## 許可證

MIT 