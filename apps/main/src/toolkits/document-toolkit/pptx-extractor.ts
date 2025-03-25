import path from 'node:path';
import { Readable } from 'node:stream';
import * as unzipper from 'unzipper';
import * as xml2js from 'xml2js';
import type { AgentTaskRef } from '../../agent/type.js';

// 定义类型接口
export interface SlideContent {
  title: string;
  text: string;
  images: SlideImage[];
  notes: string;
}

export interface SlideImage {
  name: string;
  data?: Buffer;
  type?: string;
  description?: string;
}

export interface XmlContent {
  [key: string]: unknown;
}

export class PptxExtractor {
  constructor(
    private generateImageDescription: (
      taskRef: AgentTaskRef,
      imageBase64: string,
      mimeType: string,
    ) => Promise<string>,
  ) {}

  // 提取PPTX内容
  async extractPptxContent(buffer: Buffer, taskRef: AgentTaskRef): Promise<SlideContent[]> {
    const slides: SlideContent[] = [];

    try {
      // 创建一个可读流
      const stream = Readable.from(buffer);

      // 解压PPTX文件
      const directory = await stream.pipe(unzipper.Parse()).toArray();

      // PPTX文件结构信息
      const slideContents = new Map<number, Partial<SlideContent>>();
      const slideNotes = new Map<number, string>();
      const slideImages = new Map<number, SlideImage[]>();

      // 解析XML文件
      const parser = new xml2js.Parser({ explicitArray: false });

      for (const entry of directory) {
        const fileName = entry.path;
        const content = await entry.buffer();

        // 提取幻灯片内容
        if (fileName.match(/ppt\/slides\/slide[0-9]+\.xml/)) {
          const slideNumberMatch = fileName.match(/slide([0-9]+)\.xml/);
          if (slideNumberMatch?.[1]) {
            const slideNumber = Number.parseInt(slideNumberMatch[1]);
            const result = (await parser.parseStringPromise(content)) as XmlContent;

            // 从XML中提取文本内容
            const textContent = this.extractTextFromSlideXml(result);
            const title = this.extractTitleFromSlideXml(result);

            slideContents.set(slideNumber, {
              title,
              text: textContent,
              images: [],
            });
          }
        }

        // 提取笔记
        if (fileName.match(/ppt\/notesSlides\/notesSlide[0-9]+\.xml/)) {
          const slideNumberMatch = fileName.match(/notesSlide([0-9]+)\.xml/);
          if (slideNumberMatch?.[1]) {
            const slideNumber = Number.parseInt(slideNumberMatch[1]);
            const result = (await parser.parseStringPromise(content)) as XmlContent;

            const noteText = this.extractNotesFromXml(result);
            slideNotes.set(slideNumber, noteText);
          }
        }

        // 处理图片
        if (fileName.match(/ppt\/media\/.+/)) {
          // 提取图片文件名和类型
          const imgName = path.basename(fileName);
          const fileExt = path.extname(fileName).toLowerCase();
          const imgType = this.getImageMimeType(fileExt);

          // 暂时将图片存储在一个通用列表中
          // 后续会尝试通过关系文件将图片与幻灯片关联
          const imgData = content;
          const imgBase64 = imgData.toString('base64');

          // 处理图片内容 (可选)
          try {
            const imageDescription = await this.generateImageDescription(
              taskRef,
              imgBase64,
              imgType,
            );

            // 将图片添加到所有幻灯片（或者可以在后面处理关系文件后再关联）
            // 目前简单处理，将所有图片添加到第一个幻灯片
            const slideNumber = 1; // 默认添加到第一张幻灯片
            if (!slideImages.has(slideNumber)) {
              slideImages.set(slideNumber, []);
            }

            slideImages.get(slideNumber)?.push({
              name: imgName,
              type: imgType,
              description: imageDescription, // 保存图片描述
            });
          } catch (error) {
            console.error(`处理图片 ${imgName} 时出错:`, error);
          }
        }

        // 处理幻灯片和图片的关系文件
        if (fileName.match(/ppt\/slides\/_rels\/slide[0-9]+\.xml\.rels/)) {
          const slideNumberMatch = fileName.match(/slide([0-9]+)\.xml\.rels/);
          if (slideNumberMatch?.[1]) {
            const slideNumber = Number.parseInt(slideNumberMatch[1]);
            const result = (await parser.parseStringPromise(content)) as XmlContent;

            // 尝试解析关系文件，找出图片与幻灯片的对应关系
            this.processSlideRelationships(result, slideNumber, slideImages);
          }
        }
      }

      // 组装幻灯片信息
      for (let i = 1; i <= slideContents.size; i++) {
        const slideContent = slideContents.get(i) || { title: `幻灯片 ${i}`, text: '', images: [] };
        const notes = slideNotes.get(i) || '';
        const images = slideImages.get(i) || [];

        slides.push({
          title: slideContent.title || `幻灯片 ${i}`,
          text: slideContent.text || '',
          notes: notes,
          images: images,
        });
      }

      return slides;
    } catch (error) {
      console.error('解析PPTX文件出错:', error);
      return [];
    }
  }

  // 从XML中提取文本
  private extractTextFromSlideXml(slideXml: XmlContent): string {
    let text = '';

    try {
      // 类型转换和类型守卫以确保类型安全
      const sld = slideXml['p:sld'] as XmlContent | undefined;
      if (!sld) return text;

      const cSld = sld['p:cSld'] as XmlContent | undefined;
      if (!cSld) return text;

      const spTree = cSld['p:spTree'] as XmlContent | undefined;
      if (!spTree) return text;

      const shapes = spTree['p:sp'];
      if (!shapes) return text;

      const shapesArray = Array.isArray(shapes) ? shapes : [shapes];

      for (const shape of shapesArray) {
        const txBody = (shape as XmlContent)['p:txBody'] as XmlContent | undefined;
        if (!txBody) continue;

        const paragraphs = txBody['a:p'];
        if (!paragraphs) continue;

        const paragraphsArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

        for (const para of paragraphsArray) {
          const runs = (para as XmlContent)['a:r'];
          if (!runs) continue;

          const runsArray = Array.isArray(runs) ? runs : [runs];

          for (const run of runsArray) {
            const textContent = (run as XmlContent)['a:t'];
            if (typeof textContent === 'string') {
              text += `${textContent} `;
            }
          }
          text += '\n';
        }
      }
    } catch (error) {
      console.error('提取幻灯片文本出错:', error);
    }
    return text.trim();
  }

  // 从XML中提取标题
  private extractTitleFromSlideXml(slideXml: XmlContent): string {
    try {
      const sld = slideXml['p:sld'] as XmlContent | undefined;
      if (!sld) return '';

      const cSld = sld['p:cSld'] as XmlContent | undefined;
      if (!cSld) return '';

      const spTree = cSld['p:spTree'] as XmlContent | undefined;
      if (!spTree) return '';

      const shapes = spTree['p:sp'];
      if (!shapes) return '';

      const shapesArray = Array.isArray(shapes) ? shapes : [shapes];

      // 通常标题在第一个或带有特定标识的形状中
      for (const shape of shapesArray) {
        const shapeObj = shape as XmlContent;
        const nvSpPr = shapeObj['p:nvSpPr'] as XmlContent | undefined;
        if (!nvSpPr) continue;

        const cNvPr = nvSpPr['p:cNvPr'] as XmlContent | undefined;
        if (!cNvPr) continue;

        const props = cNvPr.$ as Record<string, string> | undefined;
        if (!props?.name) continue;

        // 检查是否是标题占位符
        if (props.name.includes('Title')) {
          const txBody = shapeObj['p:txBody'] as XmlContent | undefined;
          if (!txBody) continue;

          const paragraphs = txBody['a:p'];
          if (!paragraphs) continue;

          const para = Array.isArray(paragraphs)
            ? (paragraphs[0] as XmlContent)
            : (paragraphs as XmlContent);

          const runs = para['a:r'];
          if (!runs) continue;

          const run = Array.isArray(runs) ? runs[0] : runs;
          const text = (run as XmlContent)['a:t'];

          if (typeof text === 'string') {
            return text;
          }
        }
      }
    } catch (error) {
      console.error('提取幻灯片标题出错:', error);
    }

    return '';
  }

  // 从XML中提取笔记
  private extractNotesFromXml(notesXml: XmlContent): string {
    let notes = '';

    try {
      const notesElem = notesXml['p:notes'] as XmlContent | undefined;
      if (!notesElem) return notes;

      const cSld = notesElem['p:cSld'] as XmlContent | undefined;
      if (!cSld) return notes;

      const spTree = cSld['p:spTree'] as XmlContent | undefined;
      if (!spTree) return notes;

      const shapes = spTree['p:sp'];
      if (!shapes) return notes;

      const shapesArray = Array.isArray(shapes) ? shapes : [shapes];

      for (const shape of shapesArray) {
        const shapeObj = shape as XmlContent;
        const txBody = shapeObj['p:txBody'] as XmlContent | undefined;
        if (!txBody) continue;

        const paragraphs = txBody['a:p'];
        if (!paragraphs) continue;

        const paragraphsArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

        for (const para of paragraphsArray) {
          const paraObj = para as XmlContent;
          const runs = paraObj['a:r'];
          if (!runs) continue;

          const runsArray = Array.isArray(runs) ? runs : [runs];

          for (const run of runsArray) {
            const runObj = run as XmlContent;
            const text = runObj['a:t'];

            if (typeof text === 'string') {
              notes += `${text} `;
            }
          }
          notes += '\n';
        }
      }
    } catch (error) {
      console.error('提取幻灯片笔记出错:', error);
    }

    return notes.trim();
  }

  // 获取图片MIME类型
  private getImageMimeType(extension: string): string {
    const types: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
    };

    return types[extension] || 'application/octet-stream';
  }

  // 处理幻灯片与图片的关系
  private processSlideRelationships(
    relationshipXml: XmlContent,
    slideNumber: number,
    slideImages: Map<number, SlideImage[]>,
  ): void {
    try {
      // 正确访问 Relationships 对象
      const relationships = (relationshipXml.Relationships as XmlContent)?.Relationship;
      if (!relationships) return;

      const relationshipsArray = Array.isArray(relationships) ? relationships : [relationships];

      for (const rel of relationshipsArray) {
        const relObj = rel as unknown as { $: { Target: string; Type: string } };
        const target = relObj.$?.Target;
        const type = relObj.$?.Type;

        // 检查这个关系是否指向媒体文件
        if (target && type && type.includes('image')) {
          // 从路径中提取图片名称
          const imgName = path.basename(target);

          // 确保该幻灯片在图片映射中有一个条目
          if (!slideImages.has(slideNumber)) {
            slideImages.set(slideNumber, []);
          }

          // 如果这个图片已经在通用列表中，我们可以将其移动到正确的幻灯片
          // 这里的逻辑可能需要根据实际情况调整
          const allImages = [...slideImages.values()].flat();
          const existingImage = allImages.find((img) => img.name === imgName);

          if (existingImage && !slideImages.get(slideNumber)?.some((img) => img.name === imgName)) {
            slideImages.get(slideNumber)?.push(existingImage);
          }
        }
      }
    } catch (error) {
      console.error(`处理幻灯片 ${slideNumber} 的关系时出错:`, error);
    }
  }
}
