import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';

import * as pdfjs from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api.js';
import { chartToolkits } from '../chart-toolkit/index.js';

export class PdfAnalysisAgent extends BaseAgent implements SpecializedToolAgent {
  name = 'PdfAnalysisTool';

  description = 'Pdf analysis tool';

  parameters = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Pdf url' },
      requirement: {
        type: 'string',
        description: 'Specify the content or task requirements to analyze from the PDF',
      },
    },
    required: ['url'],
  };

  strict = true;

  async execute(query: Record<string, string>, taskRef: AgentTaskRef): Promise<unknown> {
    const url = query.url;
    const requirement = query.requirement || 'Please analyze the content of the PDF document.';
    let pdfBuffer: Buffer;

    // 判断是网络URL还是本地文件路径
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // 如果是网络文件，则下载
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
        },
        responseType: 'arraybuffer',
      });
      pdfBuffer = Buffer.from(response.data);
    } else {
      // 如果是本地文件，则直接读取
      const filePath = path.resolve(url);
      pdfBuffer = await fs.readFile(filePath);
    }

    // 使用 pdfjs-dist 库替换 pdf-parse 来解析PDF内容
    // 设置 worker 源
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    // 加载文档
    const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
    const pdfDocument = await loadingTask.promise;

    // 提取文本
    let pdfText = '';
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items
        .filter((item): item is TextItem => 'str' in item)
        .map((item) => item.str);
      pdfText += `${strings.join(' ')}\n`;
    }

    // 检查PDF文本长度并处理
    const MAX_TEXT_LENGTH = 500000;
    let lengthWarning = '';

    if (pdfText.length > MAX_TEXT_LENGTH) {
      lengthWarning = `lengthWarning: This PDF document content is too long (${pdfText.length} characters), and the first ${MAX_TEXT_LENGTH} characters have been analyzed. The analysis results may be incomplete.`;
      pdfText = pdfText.substring(0, MAX_TEXT_LENGTH);
    }

    this.initialSystemMessage(`
      You are a professional PDF document analysis expert with the following capabilities and responsibilities:
      1. Extract and summarize the core content and main points of PDF documents
      2. Identify the document's structure, chapters, and logical relationships
      3. Analyze key data, charts, and table information in the document
      4. Provide targeted content analysis based on user requirements
      5. Present document content objectively without adding personal opinions
      
      When analyzing, please note:
      - Maintain a professional, objective language style
      - Adjust analysis methods according to document type (academic papers, reports, manuals, etc.)
      - Provide structured analysis results for easy user understanding
      - If you encounter unclear or unparseable content, please state so honestly
      - If the document appears to be truncated, mention this in your analysis
    `);

    const result = await this.run(
      `
      I need you to analyze the following PDF document content with this requirement: ${requirement}
      
      ${lengthWarning ? `${lengthWarning}\n\n` : ''}
      Please analyze according to the following structure:
      1. Document basic information (title, author, publication date, etc., if available)
      2. Document structure overview (main chapters and organization method)
      3. Core content summary (main viewpoints and conclusions)
      4. Important data and findings (key figures, chart information, etc.)
      5. Specific analysis for user requirements: ${requirement}
      6. Other noteworthy points
      
      Here is the PDF document content:
      ${pdfText}
    `,
      taskRef,
      [...chartToolkits],
      {},
      'LONG_TEXT',
    );

    // 返回PDF文本内容
    return result;
  }
}
