import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import yaml from 'js-yaml';
import { lastValueFrom } from 'rxjs';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';
import { PptxExtractor, type SlideContent } from './pptx-extractor.js';

interface SlideWithNumber extends SlideContent {
  number: number;
}

export class PowerPointAnalysisAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'PowerPointAnalysisTool';

  description =
    'PowerPoint Presentation Analysis Tool, capable of extracting and analyzing content from PPT files';

  parameters = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'PowerPoint file URL or local path' },
      slideNumbers: {
        type: 'string',
        description:
          'Specify slide numbers to analyze, e.g. "1,3-5" to analyze slides 1,3,4,5; if not specified, all slides will be analyzed',
      },
      requirement: {
        type: 'string',
        description: 'Specify the content or task requirements to analyze from the presentation',
      },
    },
    required: ['url'],
  };

  strict = true;

  private pptxExtractor: PptxExtractor;

  constructor() {
    super();
    this.pptxExtractor = new PptxExtractor(this.generateImageDescription.bind(this));
  }

  private async generateImageDescription(
    taskRef: AgentTaskRef,
    imageBase64: string,
    mimeType: string,
  ): Promise<string> {
    const chatCompletion = await this.generateResponse(
      taskRef.abortSignal,
      [
        {
          role: 'system',
          content: `
          You are a PPT analysis expert. Please analyze the content in the image and describe the text, charts, graphics, and other visible elements. Explain the main information expressed in the image in a detailed but concise manner.
          `,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      [],
      {},
      'IMAGE_TO_TEXT',
    );

    return await lastValueFrom(chatCompletion.contentStream);
  }

  async execute(query: Record<string, string>, taskRef: AgentTaskRef): Promise<string> {
    const { url, slideNumbers, requirement } = query;

    try {
      let buffer: Buffer;

      // 获取PPT文件内容
      if (url.startsWith('http')) {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        buffer = Buffer.from(response.data);
      } else {
        buffer = await fs.readFile(path.resolve(url));
      }

      const slidesToAnalyze = this.parseSlideNumbers(slideNumbers);

      const slides = await this.pptxExtractor.extractPptxContent(buffer, taskRef);

      const filteredSlides =
        slidesToAnalyze.length > 0
          ? slides.filter((_, index) => slidesToAnalyze.includes(index + 1))
          : slides;

      const slidesContent = filteredSlides.map((slide, index) => {
        const slideNumber = slidesToAnalyze.length > 0 ? slidesToAnalyze[index] : index + 1;

        return {
          number: slideNumber,
          title: slide.title || `Slide ${slideNumber}`,
          text: slide.text || '',
          images: slide.images || [],
          notes: slide.notes || '',
        };
      });

      const analysis = await this.analyzePresentationContent(
        slidesContent,
        requirement || 'please analyze the content of the presentation',
        taskRef,
      );

      return yaml.dump({
        totalSlides: slides.length,
        analysis,
        analyzedSlides: filteredSlides.length,
        summary: 'Successfully extracted PowerPoint presentation content',
      });
    } catch (error) {
      return yaml.dump({
        totalSlides: 0,
        analysis: 'Failed to analyze PowerPoint content',
        analyzedSlides: 0,
        summary: 'Failed to analyze PowerPoint content',
      });
    }
  }

  private parseSlideNumbers(slideNumbersStr?: string): number[] {
    if (!slideNumbersStr) return [];

    const result: number[] = [];
    const parts = slideNumbersStr.split(',');

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((num) => Number.parseInt(num.trim()));
        for (let i = start; i <= end; i++) {
          result.push(i);
        }
      } else {
        result.push(Number.parseInt(part.trim()));
      }
    }

    return result.filter((num) => !Number.isNaN(num));
  }

  private async analyzePresentationContent(
    slides: SlideWithNumber[],
    requirement: string,
    taskRef: AgentTaskRef,
  ): Promise<string> {
    let slidesContent = '';

    for (const slide of slides) {
      slidesContent += `Slide ${slide.number}: ${slide.title || 'No title'}\n`;
      slidesContent += `Content: ${slide.text || 'No text content'}\n`;

      if (slide.images && slide.images.length > 0) {
        slidesContent += `Image description: ${slide.images.join('\n')}\n`;
      }

      if (slide.notes) {
        slidesContent += `Notes: ${slide.notes}\n`;
      }

      slidesContent += '\n---\n\n';
    }

    this.initialSystemMessage(`
      You are a professional PowerPoint presentation analysis expert with the following capabilities and responsibilities:
      1. Extract and summarize the core content and main points of presentations
      2. Identify the structure, sections, and logical relationships in presentations
      3. Analyze key data, charts, and table information in presentations
      4. Provide targeted content analysis based on user requirements
      5. Present document content objectively without adding personal opinions
      
      When analyzing, please note:
      - Maintain a professional, objective language style
      - Adjust analysis methods according to presentation type (business report, training material, speech script, etc.)
      - Provide structured analysis results for easy understanding
      - Honestly indicate unclear or unparseable content
      - Mention if content appears to be truncated
    `);

    const result = await this.run(
      `
      I need you to analyze the following PowerPoint presentation content. Analysis requirements: ${requirement}
      
      Please analyze according to the following structure:
      1. Basic presentation information (title, theme, target audience, etc., if available)
      2. Presentation structure overview (main sections and organization)
      3. Core content summary (main points and conclusions)
      4. Important data and findings (key numbers, chart information, etc.)
      5. Specific analysis for user requirements: ${requirement}
      6. Other noteworthy points
      
      Here is the PowerPoint presentation content:
      ${slidesContent}
    `,
      taskRef,
      [],
      {},
      'LONG_TEXT',
    );
    if (!result) {
      throw new Error('Failed to analyze PowerPoint content');
    }

    return await lastValueFrom(result?.contentStream);
  }
}
