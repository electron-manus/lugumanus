# shrink-dom

DOM ツリーの分析、圧縮、コンテンツ抽出のためのユーティリティライブラリです。

[简体中文](../README.md) | [English](./README.en.md) | [繁體中文](./README.zh-TW.md)

## 特徴

- **DOM 分析**：`DOMDomainAnalyzer` を使用して DOM ツリーを分析し、要素の可視性、対話性、編集可能性をマークします
- **DOM 圧縮**：`DOMShrinker` を使用して HTML 構造を圧縮し、繰り返しパターンを識別し、テンプレート化された表現を生成します
- **コンテンツ抽出**：`DOMContentExtractor` を使用して DOM から意味のあるコンテンツを抽出し、広告や無関係な情報をフィルタリングします

## インストール

```bash
# npm を使用
npm install shrink-dom

# yarn を使用
yarn add shrink-dom

# bun を使用
bun add shrink-dom
```

## 使用方法

### DOM 分析

```typescript
import { DOMDomainAnalyzer } from 'shrink-dom';

// ブラウザ環境で現在のページを分析
const analyzedHTML = DOMDomainAnalyzer.analyze();
console.log(analyzedHTML);

// カスタム設定を使用
const analyzer = new DOMDomainAnalyzer({
  annotationAttribute: 'data-custom-id',
  enableHighlight: true,
  highlightDuration: 1000
});
const result = analyzer.getAnalyzedHTML();
```

### DOM 圧縮

```typescript
import { DOMShrinker } from 'shrink-dom';

// HTML 文字列を圧縮
const html = `
  <div class="card">
    <h2>タイトル1</h2>
    <p>コンテンツ1</p>
  </div>
  <div class="card">
    <h2>タイトル2</h2>
    <p>コンテンツ2</p>
  </div>
`;
const compressed = DOMShrinker.compressHTMLString(html);
console.log(compressed);

// カスタム設定を使用
const shrinker = new DOMShrinker({
  minTemplateDepth: 3,
  minTemplateOccurrences: 3,
  templateIdPrefix: 'Template'
});
const result = shrinker.compressHTML(document.body);
```

### コンテンツ抽出

```typescript
import { DOMContentExtractor } from 'shrink-dom';

// 抽出器インスタンスを作成
const extractor = new DOMContentExtractor();

// コンテンツを抽出
const extractedContent = extractor.extract(document.body);
if (extractedContent && extractor.isContentMeaningful(extractedContent)) {
  console.log('意味のあるコンテンツを抽出しました:', extractedContent.outerHTML);
}

// カスタム設定を使用
const customExtractor = new DOMContentExtractor({
  skipKeywords: ['広告', 'スポンサー'],
  preservedAttributes: ['data-id', 'title', 'aria-label']
});
```

## API リファレンス

### DOMDomainAnalyzer

DOM ツリーを分析し、要素に特性をマークします。

```typescript
// 設定オプション
interface DOMDomainAnalyzerOptions {
  annotationAttribute?: string;  // デフォルト: 'data-xgl-id'
  minInteractiveSize?: number;   // デフォルト: 20
  highlightStyle?: string;       // デフォルト: 'brightness(1.2) contrast(1.1)'
  highlightDuration?: number;    // デフォルト: 500
  enableHighlight?: boolean;     // デフォルト: true
}

// 静的メソッド
DOMDomainAnalyzer.analyze(options?: DOMDomainAnalyzerOptions): string;

// インスタンスメソッド
new DOMDomainAnalyzer(options?: DOMDomainAnalyzerOptions);
analyzer.getAnalyzedHTML(): string;
```

### DOMShrinker

HTML 構造を圧縮し、繰り返しパターンを識別します。

```typescript
// 設定オプション
interface DOMShrinkerOptions {
  minTemplateDepth?: number;       // デフォルト: 2
  minTemplateOccurrences?: number; // デフォルト: 2
  templateIdPrefix?: string;       // デフォルト: 'T'
}

// 静的メソッド
DOMShrinker.compressHTMLString(html: string, options?: DOMShrinkerOptions): string;

// インスタンスメソッド
new DOMShrinker(options?: DOMShrinkerOptions);
shrinker.compressHTML(document: Document | Element): string;
```

### DOMContentExtractor

DOM から意味のあるコンテンツを抽出します。

```typescript
// 設定オプション
interface ExtractorOptions {
  skipKeywords?: string[];        // スキップするキーワード
  preservedAttributes?: string[]; // 保持する属性
  formElementTags?: string[];     // フォーム要素タグ
  emphasisTags?: string[];        // 強調要素タグ
  briefTextThreshold?: number;    // 簡潔なテキストのしきい値
}

// インスタンスメソッド
new DOMContentExtractor(options?: ExtractorOptions);
extractor.extract(element: ChildNode): ChildNode | null;
extractor.isContentMeaningful(element: ChildNode): boolean;
```

## 開発

```bash
# 依存関係をインストール
bun install

# テストを実行
bun test

# ビルド
bun run build
```

## ライセンス

MIT 