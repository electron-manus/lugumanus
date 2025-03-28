import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import yaml from 'js-yaml';
import { marked } from 'marked';
import type { Token } from 'marked';
import { lastValueFrom } from 'rxjs';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';
// 定义Markdown结构类型
interface MarkdownHeading {
  level: number;
  text: string;
}

interface MarkdownLink {
  text: string;
  href: string;
}

interface MarkdownCodeBlock {
  language: string;
  code: string;
}

interface MarkdownList {
  ordered: boolean;
  items: string[];
}

interface MarkdownStructure {
  headings: MarkdownHeading[];
  links: MarkdownLink[];
  codeBlocks: MarkdownCodeBlock[];
  lists: MarkdownList[];
  totalTokens: number;
}

export class MarkdownAnalysisAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'MarkdownAnalysisTool';

  description =
    'Markdown document analysis tool that can parse and analyze documents in Markdown format';

  parameters = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Markdown document URL or local path' },
      requirement: {
        type: 'string',
        description: 'Specify content or task requirements to analyze from the Markdown document',
      },
    },
    required: ['url'],
  };

  strict = true;

  async execute(query: Record<string, string>, taskRef: AgentTaskRef): Promise<string> {
    const { url, requirement } = query;

    try {
      let content: string;

      // 获取Markdown内容
      if (url.startsWith('http')) {
        const response = await axios.get(url);
        content = response.data;
      } else {
        content = await fs.readFile(path.resolve(url), 'utf-8');
      }

      // 解析Markdown内容
      const tokens = marked.lexer(content);

      // 提取结构化信息
      const structure = this.extractDocumentStructure(tokens);

      // 如果有特定需求，进一步分析内容
      let analysis = '';
      if (requirement) {
        analysis = await this.analyzeContent(content, structure, requirement, taskRef);
      }

      return yaml.dump({
        content: content,
        structure: structure,
        analysis: analysis,
        summary: requirement
          ? `Analysis of Markdown document based on requirement "${requirement}"`
          : 'Successfully parsed Markdown document',
      });
    } catch (error) {
      return yaml.dump({
        content: '',
        structure: {
          headings: [],
          links: [],
          codeBlocks: [],
          lists: [],
          totalTokens: 0,
        },
        summary: '',
        error: `Error analyzing Markdown document: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  private extractDocumentStructure(tokens: Token[]): MarkdownStructure {
    const headings: MarkdownHeading[] = [];
    const links: MarkdownLink[] = [];
    const codeBlocks: MarkdownCodeBlock[] = [];
    const lists: MarkdownList[] = [];

    for (const token of tokens) {
      if (token.type === 'heading') {
        headings.push({
          level: token.depth,
          text: token.text,
        });
      } else if (token.type === 'link') {
        links.push({
          text: token.text,
          href: token.href,
        });
      } else if (token.type === 'code') {
        codeBlocks.push({
          language: token.lang || 'Unspecified',
          code: token.text,
        });
      } else if (token.type === 'list') {
        lists.push({
          ordered: token.ordered,
          items: token.items.map((item: { text: string }) => item.text),
        });
      }
    }

    return {
      headings,
      links,
      codeBlocks,
      lists,
      totalTokens: tokens.length,
    };
  }

  private async analyzeContent(
    content: string,
    structure: MarkdownStructure,
    requirement: string,
    taskRef: AgentTaskRef,
  ): Promise<string> {
    // 准备Markdown文档的文本表示
    let markdownContent = '';

    // 添加文档结构信息
    markdownContent += '## Document Structure Information\n';
    markdownContent += `- Total headings: ${structure.headings.length}\n`;
    markdownContent += `- Total links: ${structure.links.length}\n`;
    markdownContent += `- Total code blocks: ${structure.codeBlocks.length}\n`;
    markdownContent += `- Total lists: ${structure.lists.length}\n\n`;

    // 添加标题大纲
    if (structure.headings.length > 0) {
      markdownContent += '## Document Outline\n';
      for (const heading of structure.headings) {
        markdownContent += `${'#'.repeat(heading.level)} ${heading.text}\n`;
      }
      markdownContent += '\n';
    }

    // 添加原始内容摘要
    markdownContent += '## Original Document Content\n';
    markdownContent += `${content.substring(0, 3000)}${content.length > 3000 ? '...(content truncated)' : ''}\n`;

    this.initialSystemMessage(`
      You are a professional Markdown document analysis expert with the following abilities and responsibilities:
      1. Extract and summarize the core content and structure of Markdown documents
      2. Identify document structure, relationships, and inconsistencies
      3. Analyze document organization, argumentation flow, and main points
      4. Provide targeted document analysis based on user requirements
      5. Objectively present document content without adding subjective assumptions
      
      When analyzing, please note:
      - Maintain a professional, objective language style
      - Adjust analysis methods according to document type (technical documentation, tutorial, report, etc.)
      - Provide structured analysis results for easy understanding
      - Honestly point out unclear or potentially problematic content
      - Mention whether the document content is complete
    `);

    const result = await this.run(
      `
      I need you to analyze the following Markdown document. Analysis requirement: ${requirement}
      
      Please analyze according to the following structure:
      1. Basic document information (type, scope, length)
      2. Document structure overview (organization, chapter division, logical relationships)
      3. Core content summary (main arguments, key information, important references)
      4. Important insights and findings (viewpoints, conclusions, special elements)
      5. Specific analysis for user requirements: ${requirement}
      6. Document quality observations and other points worth noting
      
      Below is the Markdown document content:
      ${markdownContent}
    `,
      taskRef,
      [],
      {},
      'LONG_TEXT',
    );

    if (!result) {
      throw new Error('Unable to analyze Markdown content');
    }

    return await lastValueFrom(result?.contentStream);
  }
}
