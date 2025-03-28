import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import yaml from 'js-yaml';
import { JSDOM } from 'jsdom';
// 可以使用mammoth等库来处理Word文档
import mammoth from 'mammoth';
import { lastValueFrom } from 'rxjs';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';

// 定义Word文档结构类型
interface WordDocumentHeading {
  level: number;
  text: string;
}

interface WordDocumentLink {
  text: string;
  href: string;
}

interface WordDocumentTable {
  rows: number;
  columns: number;
}

interface WordDocumentStructure {
  headings: WordDocumentHeading[];
  links: WordDocumentLink[];
  tables: WordDocumentTable[];
  paragraphs: number;
  images: number;
}

export class WordAnalysisAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'WordAnalysisTool';

  description = 'Word Document Analysis Tool';

  parameters = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Word document URL or local path' },
      requirement: {
        type: 'string',
        description:
          'Specify the content or task requirements to be analyzed from the Word document',
      },
    },
    required: ['url'],
  };

  strict = true;

  async execute(query: Record<string, string>, taskRef: AgentTaskRef): Promise<string> {
    const { url, requirement } = query;

    try {
      let buffer: Buffer;

      // 获取Word文档内容
      if (url.startsWith('http')) {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        buffer = Buffer.from(response.data);
      } else {
        buffer = await fs.readFile(path.resolve(url));
      }

      // 使用mammoth将Word文档转换为HTML
      const result = await mammoth.convertToHtml({ buffer });
      const htmlContent = result.value;
      const warnings = result.messages;

      // 提取文档结构
      const structure = this.extractDocumentStructure(htmlContent);

      // 如果有特定需求，进一步分析内容
      let analysis = '';
      if (requirement) {
        analysis = await this.analyzeContent(htmlContent, structure, requirement, taskRef);
      }

      return yaml.dump({
        htmlContent: htmlContent,
        structure: structure,
        warnings: warnings,
        analysis: analysis,
        summary: requirement
          ? `Word document analysis based on requirement "${requirement}"`
          : 'Successfully parsed Word document',
      });
    } catch (error) {
      return yaml.dump({
        htmlContent: '',
        structure: {
          headings: [],
          links: [],
          tables: [],
          paragraphs: 0,
          images: 0,
        },
        summary: '',
        error: `Error analyzing Word document: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  private extractDocumentStructure(htmlContent: string): WordDocumentStructure {
    const headings: WordDocumentHeading[] = [];
    const links: WordDocumentLink[] = [];
    const tables: WordDocumentTable[] = [];

    const doc = new JSDOM(htmlContent).window.document;

    // 提取标题
    for (let i = 1; i <= 6; i++) {
      const headingElements = doc.querySelectorAll(`h${i}`);
      for (const element of headingElements) {
        headings.push({
          level: i,
          text: element.textContent || '',
        });
      }
    }

    // 提取链接
    const linkElements = doc.querySelectorAll('a');
    for (const element of linkElements) {
      links.push({
        text: element.textContent || '',
        href: element.getAttribute('href') || '',
      });
    }

    // 提取表格
    const tableElements = doc.querySelectorAll('table');
    for (const table of tableElements) {
      const rows = table.querySelectorAll('tr').length;
      let columns = 0;
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        columns = firstRow.querySelectorAll('td, th').length;
      }
      tables.push({ rows, columns });
    }

    // 计算段落和图片数量
    const paragraphs = doc.querySelectorAll('p').length;
    const images = doc.querySelectorAll('img').length;

    return {
      headings,
      links,
      tables,
      paragraphs,
      images,
    };
  }

  private async analyzeContent(
    htmlContent: string,
    structure: WordDocumentStructure,
    requirement: string,
    taskRef: AgentTaskRef,
  ): Promise<string> {
    // 准备Word文档的文本表示
    let documentContent = '';

    // 添加文档结构信息
    documentContent += '## Document Structure Information\n';
    documentContent += `- Number of headings: ${structure.headings.length}\n`;
    documentContent += `- Number of links: ${structure.links.length}\n`;
    documentContent += `- Number of tables: ${structure.tables.length}\n`;
    documentContent += `- Number of paragraphs: ${structure.paragraphs}\n`;
    documentContent += `- Number of images: ${structure.images}\n\n`;

    // 添加标题大纲
    if (structure.headings.length > 0) {
      documentContent += '## Document Outline\n';
      for (const heading of structure.headings) {
        documentContent += `${'#'.repeat(heading.level)} ${heading.text}\n`;
      }
      documentContent += '\n';
    }

    // 添加文档内容摘要
    documentContent += '## Document Content\n';
    // 移除HTML标签获取纯文本
    const textContent = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    documentContent += `${textContent.substring(0, 3000)}${textContent.length > 3000 ? '...(content truncated)' : ''}\n`;

    this.initialSystemMessage(`
      You are a professional Word document analysis expert with the following capabilities and responsibilities:
      1. Extract and summarize the core content and structure of Word documents
      2. Identify document structure, relationships and inconsistencies
      3. Analyze document organization, argumentation flow and main points
      4. Provide targeted document analysis based on user requirements
      5. Objectively present document content without adding subjective assumptions
      
      When analyzing, please note:
      - Maintain a professional, objective language style
      - Adjust analysis methods according to document type (technical document, tutorial, report, etc.)
      - Provide structured analysis results for easy understanding
      - Honestly point out unclear or potentially problematic content
      - Indicate whether the document content is complete
    `);

    const result = await this.run(
      `
      I need you to analyze the following Word document. Analysis requirements: ${requirement}
      
      Please analyze according to the following structure:
      1. Basic document information (type, scope, length)
      2. Document structure overview (organization, chapter division, logical relationships)
      3. Core content summary (main arguments, key information, important references)
      4. Important insights and findings (viewpoints, conclusions, special elements)
      5. Specific analysis for user requirements: ${requirement}
      6. Document quality observations and other noteworthy points
      
      Here is the Word document content:
      ${documentContent}
    `,
      taskRef,
      [],
      {},
      'LONG_TEXT',
    );

    if (!result) {
      throw new Error('Unable to analyze Word document content');
    }

    return await lastValueFrom(result?.contentStream);
  }
}
