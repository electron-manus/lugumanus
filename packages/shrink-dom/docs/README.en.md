# shrink-dom

A utility library for DOM tree analysis, compression, and content extraction.

[简体中文](../README.md) | [日本語](./README.ja.md) | [繁體中文](./README.zh-TW.md)

## Features

- **DOM Analysis**: Use `DOMDomainAnalyzer` to analyze DOM trees, marking elements for visibility, interactivity, and editability
- **DOM Compression**: Use `DOMShrinker` to compress HTML structures, identify repetitive patterns, and generate templated representations
- **Content Extraction**: Use `DOMContentExtractor` to extract meaningful content from the DOM, filtering out ads and irrelevant information

## Installation

```bash
# Using npm
npm install shrink-dom

# Using yarn
yarn add shrink-dom

# Using bun
bun add shrink-dom
```

## Usage

### DOM Analysis

```typescript
import { DOMDomainAnalyzer } from 'shrink-dom';

// Analyze the current page in a browser environment
const analyzedHTML = DOMDomainAnalyzer.analyze();
console.log(analyzedHTML);

// Use custom configuration
const analyzer = new DOMDomainAnalyzer({
  annotationAttribute: 'data-custom-id',
  enableHighlight: true,
  highlightDuration: 1000
});
const result = analyzer.getAnalyzedHTML();
```

### DOM Compression

```typescript
import { DOMShrinker } from 'shrink-dom';

// Compress an HTML string
const html = `
  <div class="card">
    <h2>Title 1</h2>
    <p>Content 1</p>
  </div>
  <div class="card">
    <h2>Title 2</h2>
    <p>Content 2</p>
  </div>
`;
const compressed = DOMShrinker.compressHTMLString(html);
console.log(compressed);

// Use custom configuration
const shrinker = new DOMShrinker({
  minTemplateDepth: 3,
  minTemplateOccurrences: 3,
  templateIdPrefix: 'Template'
});
const result = shrinker.compressHTML(document.body);
```

### Content Extraction

```typescript
import { DOMContentExtractor } from 'shrink-dom';

// Create an extractor instance
const extractor = new DOMContentExtractor();

// Extract content
const extractedContent = extractor.extract(document.body);
if (extractedContent && extractor.isContentMeaningful(extractedContent)) {
  console.log('Extracted meaningful content:', extractedContent.outerHTML);
}

// Use custom configuration
const customExtractor = new DOMContentExtractor({
  skipKeywords: ['advertisement', 'sponsored'],
  preservedAttributes: ['data-id', 'title', 'aria-label']
});
```

## API Reference

### DOMDomainAnalyzer

Analyzes DOM trees and marks elements with their characteristics.

```typescript
// Configuration options
interface DOMDomainAnalyzerOptions {
  annotationAttribute?: string;  // Default: 'data-xgl-id'
  minInteractiveSize?: number;   // Default: 20
  highlightStyle?: string;       // Default: 'brightness(1.2) contrast(1.1)'
  highlightDuration?: number;    // Default: 500
  enableHighlight?: boolean;     // Default: true
}

// Static methods
DOMDomainAnalyzer.analyze(options?: DOMDomainAnalyzerOptions): string;

// Instance methods
new DOMDomainAnalyzer(options?: DOMDomainAnalyzerOptions);
analyzer.getAnalyzedHTML(): string;
```

### DOMShrinker

Compresses HTML structures and identifies repetitive patterns.

```typescript
// Configuration options
interface DOMShrinkerOptions {
  minTemplateDepth?: number;       // Default: 2
  minTemplateOccurrences?: number; // Default: 2
  templateIdPrefix?: string;       // Default: 'T'
}

// Static methods
DOMShrinker.compressHTMLString(html: string, options?: DOMShrinkerOptions): string;

// Instance methods
new DOMShrinker(options?: DOMShrinkerOptions);
shrinker.compressHTML(document: Document | Element): string;
```

### DOMContentExtractor

Extracts meaningful content from the DOM.

```typescript
// Configuration options
interface ExtractorOptions {
  skipKeywords?: string[];        // Keywords to skip
  preservedAttributes?: string[]; // Attributes to preserve
  formElementTags?: string[];     // Form element tags
  emphasisTags?: string[];        // Emphasis element tags
  briefTextThreshold?: number;    // Brief text threshold
}

// Instance methods
new DOMContentExtractor(options?: ExtractorOptions);
extractor.extract(element: ChildNode): ChildNode | null;
extractor.isContentMeaningful(element: ChildNode): boolean;
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build
```

## License

MIT 