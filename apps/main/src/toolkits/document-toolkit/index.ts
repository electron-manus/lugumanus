import { ExcelAnalysisAgent } from './excel-analysis-agent.js';
import { MarkdownAnalysisAgent } from './markdown-analysis-agent.js';
import { PdfAnalysisAgent } from './pdf-analysis-agent.js';
import { PowerPointAnalysisAgent } from './powerpoint-analysis-agent.js';
import { WordAnalysisAgent } from './word-analysis-agent.js';

export const documentToolkits = [
  new PdfAnalysisAgent(),
  new WordAnalysisAgent(),
  new ExcelAnalysisAgent(),
  new PowerPointAnalysisAgent(),
  new MarkdownAnalysisAgent(),
];
