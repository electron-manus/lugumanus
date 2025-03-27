import { JSDOM } from 'jsdom';
import { NodeTypeEnum } from './types';

import path from 'node:path';
import type {
  ChosenTemplate,
  DOMShrinkerOptions,
  JsonNode,
  OptimizedTemplate,
  PossibleTemplate,
} from './types';

export class DOMShrinker {
  // 静态常量
  private static readonly SELF_CLOSING_TAGS = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);

  private static readonly DEFAULT_MIN_TEMPLATE_DEPTH = 2;
  private static readonly DEFAULT_MIN_TEMPLATE_OCCURRENCES = 2;
  private static readonly DEFAULT_TEMPLATE_ID_PREFIX = 'T';

  // 默认语义属性集
  private static readonly DEFAULT_SEMANTIC_ATTRIBUTES = [
    'id',
    'role',
    'data-testid',
    'data-purpose',
    'data-section',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'name',
    'type',
    'for',
  ];

  // 默认UI模式选择器
  private static readonly UI_PATTERN_SELECTORS = {
    forms: ['form', 'input', 'button', 'select', 'textarea', 'label'],
    navigation: ['nav', 'a', 'ul.menu', 'ul.nav', '.navigation'],
    cards: ['.card', 'article', '.item', '.product'],
    tables: ['table', 'tr', 'td', 'th', 'thead', 'tbody'],
  };

  // 默认配置
  private readonly options: Required<DOMShrinkerOptions>;

  /**
   * 创建一个新的DOM压缩器实例
   * @param options 配置选项
   */
  constructor(options: DOMShrinkerOptions = {}) {
    // 使用默认值合并用户提供的选项
    this.options = {
      minTemplateDepth: options.minTemplateDepth ?? DOMShrinker.DEFAULT_MIN_TEMPLATE_DEPTH,
      minTemplateOccurrences:
        options.minTemplateOccurrences ?? DOMShrinker.DEFAULT_MIN_TEMPLATE_OCCURRENCES,
      templateIdPrefix: options.templateIdPrefix ?? DOMShrinker.DEFAULT_TEMPLATE_ID_PREFIX,

      // 新增语义选项的默认值
      semanticAttributes: options.semanticAttributes ?? DOMShrinker.DEFAULT_SEMANTIC_ATTRIBUTES,
      useHeuristicRules: options.useHeuristicRules ?? true,
      uiPatterns: {
        forms: options.uiPatterns?.forms ?? true,
        navigation: options.uiPatterns?.navigation ?? true,
        cards: options.uiPatterns?.cards ?? true,
        tables: options.uiPatterns?.tables ?? true,
        custom: options.uiPatterns?.custom ?? {},
      },
      semanticPreservationLevel: options.semanticPreservationLevel ?? 'medium',
      preserveDataAttributes: options.preserveDataAttributes ?? true,
      preserveAriaAttributes: options.preserveAriaAttributes ?? true,
      preserveRoles: options.preserveRoles ?? true,
      criticalAttributes: options.criticalAttributes ?? ['id', 'name', 'action', 'method'],
    };
  }

  /**
   * 将DOM节点转换为JSON表示
   */
  private nodeToJson(node: Node): JsonNode {
    if (node.nodeType === NodeTypeEnum.TEXT_NODE) {
      // 文本节点 - 优化文本处理
      const text = node.textContent?.trim() || '';
      if (!text) return { type: 'text', text: '' };
      return { type: 'text', text };
    }

    if (node.nodeType === NodeTypeEnum.ELEMENT_NODE) {
      // 元素节点 - 使用类型断言优化
      const element = node as Element;
      const attrs: Record<string, string> = {};

      // 获取所有属性 - 使用for...of循环提高可读性
      for (const attr of Array.from(element.attributes)) {
        if (attr) {
          attrs[attr.name] = attr.value || '';
        }
      }

      // 优化子节点处理 - 使用过滤器和映射函数简化
      const children: JsonNode[] = Array.from(node.childNodes)
        .map((child: Node) => this.nodeToJson(child))
        .filter(
          (childJson) =>
            (childJson.type === 'text' && childJson.text) || childJson.type === 'element',
        );

      return {
        type: 'element',
        tag: element.tagName.toLowerCase(),
        attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
        children: children.length > 0 ? children : undefined,
      };
    }

    return { type: 'text', text: '' }; // 默认返回空文本节点
  }

  /**
   * 检查属性是否为语义属性
   */
  private isSemanticAttribute(attrName: string): boolean {
    // 检查是否在用户配置的语义属性列表中
    if (this.options.semanticAttributes.includes(attrName)) {
      return true;
    }

    // 根据语义保留级别检查常见语义属性模式
    if (this.options.semanticPreservationLevel !== 'low') {
      // 检查data-*属性
      if (this.options.preserveDataAttributes && attrName.startsWith('data-')) {
        return true;
      }

      // 检查aria-*属性
      if (this.options.preserveAriaAttributes && attrName.startsWith('aria-')) {
        return true;
      }

      // 角色属性
      if (this.options.preserveRoles && attrName === 'role') {
        return true;
      }
    }

    // 检查是否为绝对关键属性
    return this.options.criticalAttributes.includes(attrName);
  }

  /**
   * 改进的计算节点哈希函数，考虑语义因素
   */
  private computeNodeHash(node: JsonNode): string {
    if (node.type === 'text') {
      return `text:${node.text?.length || 0}`;
    }

    // 分离普通属性和语义属性
    const regularAttrs: string[] = [];
    const semanticAttrs: string[] = [];

    if (node.attrs) {
      for (const [key, value] of Object.entries(node.attrs)) {
        if (this.isSemanticAttribute(key)) {
          // 语义属性包含具体值，提高区分度
          semanticAttrs.push(`${key}=${value}`);
        } else {
          // 非语义属性只考虑名称
          regularAttrs.push(key);
        }
      }
    }

    // 根据UI模式应用启发式规则
    let patternSignature = '';
    if (this.options.useHeuristicRules && node.type === 'element') {
      patternSignature = this.detectUIPattern(node);
    }

    const childrenHashes = node.children
      ? node.children.map((child) => this.computeNodeHash(child)).join(',')
      : '';

    // 哈希中加入语义信息，优先考虑语义属性
    return `${node.tag}[pattern:${patternSignature}][semantic:${semanticAttrs.sort().join(',')}][attr:${regularAttrs
      .sort()
      .join(',')}](${childrenHashes})`;
  }

  /**
   * 检测节点的UI模式
   */
  private detectUIPattern(node: JsonNode): string {
    if (node.type !== 'element') return '';

    const tag = node.tag?.toLowerCase() || '';
    const classAttr = node.attrs?.class || '';
    const classes = classAttr.split(/\s+/).filter(Boolean);
    const role = node.attrs?.role || '';

    // 检查是否匹配表单模式
    if (
      this.options.uiPatterns.forms &&
      (DOMShrinker.UI_PATTERN_SELECTORS.forms.includes(tag) ||
        role === 'form' ||
        classAttr.includes('form'))
    ) {
      return 'form';
    }

    // 检查是否匹配导航模式
    if (
      this.options.uiPatterns.navigation &&
      (DOMShrinker.UI_PATTERN_SELECTORS.navigation.includes(tag) ||
        role === 'navigation' ||
        classAttr.includes('nav'))
    ) {
      return 'navigation';
    }

    // 检查是否匹配卡片模式
    if (
      this.options.uiPatterns.cards &&
      DOMShrinker.UI_PATTERN_SELECTORS.cards.some(
        (selector) => tag === selector || classes.some((cls) => selector === `.${cls}`),
      )
    ) {
      return 'card';
    }

    // 检查是否匹配表格模式
    if (
      this.options.uiPatterns.tables &&
      (DOMShrinker.UI_PATTERN_SELECTORS.tables.includes(tag) || role === 'table' || role === 'grid')
    ) {
      return 'table';
    }

    // 检查自定义模式
    for (const [patternName, selectors] of Object.entries(this.options.uiPatterns.custom || {})) {
      if (
        selectors.some(
          (selector) =>
            tag === selector ||
            classes.some((cls) => selector === `.${cls}`) ||
            (selector.startsWith('[') &&
              selector.endsWith(']') &&
              node.attrs?.[selector.slice(1, -1)]),
        )
      ) {
        return patternName;
      }
    }

    return '';
  }

  /**
   * 改进的模板检测方法，考虑节点的上下文位置
   */
  private detectTemplates(root: JsonNode): PossibleTemplate[] {
    const templates: Record<string, PossibleTemplate> = {};
    const minDepth = this.options.minTemplateDepth;
    const minOccurrences = this.options.minTemplateOccurrences;

    // 使用改进的语义感知哈希替代简单的模板哈希
    const traverse = (node: JsonNode, depth: number, path = '') => {
      // 存储路径信息
      node.path = path;

      // 使用语义感知的哈希函数计算节点哈希
      const basicHash = this.computeNodeHash(node);
      node.templateHash = basicHash;

      // 如果节点有足够的深度，将其添加为潜在模板
      if (depth >= minDepth && node.type === 'element') {
        // 创建包含上下文信息的哈希
        const contextualHash = this.createContextualHash(node, basicHash, path);

        if (!templates[contextualHash]) {
          templates[contextualHash] = {
            hash: contextualHash,
            structure: JSON.parse(JSON.stringify(node)),
            occurrences: [],
            depth,
            path, // 存储模板的路径信息
          };
        }
        templates[contextualHash].occurrences.push(node);
      }

      // 递归处理子节点
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          traverse(node.children[i], depth + 1, `${path}/${node.tag}[${i}]`);
        }
      }
    };

    traverse(root, 0, '');

    return Object.values(templates).filter((t) => t.occurrences.length >= minOccurrences);
  }

  /**
   * 创建考虑上下文的哈希值
   */
  private createContextualHash(node: JsonNode, basicHash: string, path: string): string {
    // 提取路径中的关键部分，帮助区分不同功能区域
    const pathSegments = path.split('/').filter(Boolean);
    const contextDepth = Math.min(3, pathSegments.length); // 只考虑最近的几级祖先
    const relevantPath = pathSegments.slice(-contextDepth).join('/');

    // 检查节点是否含有语义标识符
    const semanticId = this.extractSemanticIdentifier(node);

    // 在高语义保留级别下，将语义标识符添加到哈希中
    if (this.options.semanticPreservationLevel === 'high' && semanticId) {
      return `${basicHash}#${relevantPath}#${semanticId}`;
    }

    // 在中等语义保留级别下，仅对特定UI模式添加路径信息
    if (this.options.semanticPreservationLevel === 'medium') {
      const pattern = this.detectUIPattern(node);
      if (pattern) {
        return `${basicHash}#${pattern}#${relevantPath}`;
      }
    }

    // 在低语义保留级别下，仅使用基本哈希
    return basicHash;
  }

  /**
   * 提取节点的语义标识符
   */
  private extractSemanticIdentifier(node: JsonNode): string {
    if (node.type !== 'element' || !node.attrs) return '';

    // 按优先级检查关键语义属性
    for (const attr of ['id', 'data-testid', 'data-purpose', 'name']) {
      if (node.attrs[attr]) {
        return `${attr}:${node.attrs[attr]}`;
      }
    }

    // 检查role属性
    if (node.attrs.role) {
      return `role:${node.attrs.role}`;
    }

    // 检查class中的语义名称（如login-form, register-card等）
    const classAttr = node.attrs.class || '';
    const semanticClasses = classAttr
      .split(/\s+/)
      .filter((cls) => /-(form|container|section|card|wrapper|box|panel)$/.test(cls));

    if (semanticClasses.length > 0) {
      return `class:${semanticClasses[0]}`;
    }

    return '';
  }

  /**
   * 分析并优化模板结构
   */
  private analyzeTemplate(template: PossibleTemplate): OptimizedTemplate {
    const inlineValues: Record<string, string | null> = {};
    const nodeCache = new Map<string, JsonNode[]>(); // 添加缓存提高性能

    const analyzeNode = (nodes: JsonNode[], path: string) => {
      if (nodes.length === 0) return;

      const cacheKey = `${path}-${nodes.length}`;
      if (nodeCache.has(cacheKey)) {
        return; // 避免重复分析
      }
      nodeCache.set(cacheKey, nodes);

      // 检查所有节点是否为文本节点且文本相同
      if (nodes[0]?.type === 'text') {
        const firstText = nodes[0]?.text;
        const allSame = nodes.every((n) => n.text === firstText);

        if (allSame) {
          inlineValues[path] = firstText || null;
        } else {
          inlineValues[path] = null; // 标记为变量
        }
        return;
      }

      // 检查属性
      if (nodes[0]?.attrs) {
        const attrKeys = Object.keys(nodes[0]?.attrs || {});

        for (const key of attrKeys) {
          const attrPath = `${path}.attrs.${key}`;
          const firstValue = nodes[0]?.attrs?.[key] || '';

          // 语义属性处理特殊化
          if (this.isSemanticAttribute(key)) {
            // 根据语义保留级别决定是否内联
            if (this.options.semanticPreservationLevel === 'high') {
              // 高级别：永不将语义属性标记为变量
              inlineValues[attrPath] = firstValue;
            } else if (this.options.semanticPreservationLevel === 'medium') {
              // 中级别：只有完全相同的语义属性才内联
              const allSame = nodes.every((n) => n.attrs && n.attrs[key] === firstValue);
              inlineValues[attrPath] = allSame ? firstValue : null;
            } else {
              // 低级别：像普通属性一样处理
              const allSame = nodes.every((n) => n.attrs && n.attrs[key] === firstValue);
              inlineValues[attrPath] = allSame ? firstValue : null;
            }
          } else {
            // 非语义属性正常处理
            const allSame = nodes.every((n) => n.attrs && n.attrs[key] === firstValue);
            inlineValues[attrPath] = allSame ? firstValue : null;
          }
        }
      }

      // 递归处理子节点
      if (nodes[0]?.children) {
        nodes[0]?.children.forEach((_, i) => {
          const childNodes = nodes
            .map((n) => n.children?.[i])
            .filter((node): node is JsonNode => Boolean(node));
          analyzeNode(childNodes, `${path}.children.${i}`);
        });
      }
    };

    analyzeNode(template.occurrences, '');

    return {
      structure: template.structure,
      inlineValues,
      occurrences: template.occurrences,
      depth: template.depth,
      hash: template.hash,
      path: template.path, // 保存路径信息
    };
  }

  /**
   * 筛选最佳模板
   */
  private selectBestTemplates(templates: OptimizedTemplate[]): ChosenTemplate[] {
    // 按照出现次数和深度排序
    const sortedTemplates = [...templates].sort((a, b) => {
      const scoreA = a.occurrences.length * a.depth;
      const scoreB = b.occurrences.length * b.depth;
      return scoreB - scoreA;
    });

    const chosen: ChosenTemplate[] = [];
    const usedNodes = new Set<JsonNode>();

    for (const template of sortedTemplates) {
      // 过滤掉已经被其他模板使用的节点
      const availableOccurrences = template.occurrences.filter((node) => !usedNodes.has(node));

      if (availableOccurrences.length >= 2) {
        // 至少需要两次出现才值得模板化
        const replacements = new Map<JsonNode, number[]>();

        // 分析每个节点需要的参数
        for (const node of availableOccurrences) {
          const params: number[] = [];

          // 遍历所有非内联值，确定参数位置
          Object.entries(template.inlineValues)
            .filter(([_, value]) => value === null)
            .forEach((_, index) => {
              params.push(index);
            });

          replacements.set(node, params);
          usedNodes.add(node);
        }

        chosen.push({
          ...template,
          id: `${this.options.templateIdPrefix}${chosen.length + 1}`,
          occurrences: availableOccurrences,
          replacements,
        });
      }
    }

    return chosen;
  }

  /**
   * 构建模板化的节点树
   */
  private buildTemplateTree(root: JsonNode, templates: ChosenTemplate[]): JsonNode {
    // 创建一个新的树，将模板引用替换为特殊节点
    const cloneWithTemplates = (node: JsonNode): JsonNode => {
      // 检查节点是否是模板的一部分
      for (const template of templates) {
        if (template.replacements.has(node)) {
          const params = template.replacements.get(node);
          if (params) {
            return {
              type: 'template',
              templateId: template.id,
              params,
            };
          }
        }
      }

      // 如果不是模板，递归克隆
      const clone: JsonNode = { ...node };

      if (node.children) {
        clone.children = node.children.map(cloneWithTemplates);
      }

      return clone;
    };

    return cloneWithTemplates(root);
  }

  /**
   * 将节点树序列化为字符串
   */
  private stringifyTree(root: JsonNode, templates: ChosenTemplate[]): string {
    const parts: string[] = [];

    // 首先添加模板定义
    for (const template of templates) {
      const templateDef = this.stringifyTemplate(template);
      parts.push(`${template.id}: ${templateDef}`);
    }

    parts.push(''); // 添加一个空行分隔符

    // 然后添加使用模板的HTML
    parts.push(this.stringifyNode(root));

    return parts.join('\n');
  }

  /**
   * 将模板结构序列化为字符串
   */
  private stringifyTemplate(template: ChosenTemplate): string {
    // 创建模板结构的字符串表示
    const serializeStructure = (node: JsonNode): string => {
      if (node.type === 'text') {
        // 转义特殊字符
        return this.escapeHtml(node.text || '');
      }

      let result = `<${node.tag}`;

      if (node.attrs) {
        for (const [key, value] of Object.entries(node.attrs)) {
          result += ` ${key}="${value}"`;
        }
      }

      if (!node.children || node.children.length === 0) {
        // 使用与 stringifyNode 相同的逻辑
        if (DOMShrinker.SELF_CLOSING_TAGS.has(node.tag || '')) {
          return `${result} />`;
        }

        return `${result}></${node.tag}>`;
      }

      result += '>';

      if (node.children) {
        for (const child of node.children) {
          result += serializeStructure(child);
        }
      }

      return `${result}</${node.tag}>`;
    };

    return serializeStructure(template.structure);
  }

  /**
   * 将单个节点序列化为字符串
   */
  private stringifyNode(node: JsonNode): string {
    // 处理模板引用
    if (node.type === 'template') {
      return `{${node.templateId}(${node.params?.join(',') || ''})}`;
    }

    if (node.type === 'text') {
      return this.escapeHtml(node.text || '');
    }

    let result = `<${node.tag}`;

    if (node.attrs) {
      // 使用数组连接而不是字符串拼接，提高性能
      const attrParts: string[] = [];
      for (const [key, value] of Object.entries(node.attrs)) {
        attrParts.push(` ${key}="${value}"`);
      }
      result += attrParts.join('');
    }

    if (!node.children || node.children.length === 0) {
      if (DOMShrinker.SELF_CLOSING_TAGS.has(node.tag || '')) {
        return `${result} />`;
      }

      return `${result}></${node.tag}>`;
    }

    result += '>';

    if (node.children) {
      // 使用数组连接而不是字符串拼接
      const childParts: string[] = [];
      for (const child of node.children) {
        childParts.push(this.stringifyNode(child));
      }
      result += childParts.join('');
    }

    return `${result}</${node.tag}>`;
  }

  // 添加一个辅助方法来转义 HTML 特殊字符
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 添加辅助方法计算节点大小
  private calculateNodeSize(node: JsonNode): number {
    let size = 1; // 基础大小

    if (node.attrs) {
      size += Object.keys(node.attrs).length;
    }

    if (node.children) {
      size += node.children.reduce((sum, child) => sum + this.calculateNodeSize(child), 0);
    }

    return size;
  }

  /**
   * 压缩HTML
   * @param document DOM文档或文档元素
   * @returns 压缩后的HTML字符串
   */
  public compressHTML(document: Document | Element): string {
    // 使用缓存提高性能
    const cache = new Map<Node, JsonNode>();

    // 修改 nodeToJson 方法以使用缓存
    const nodeToJsonWithCache = (node: Node): JsonNode => {
      if (cache.has(node)) {
        return cache.get(node) as JsonNode;
      }

      const result = this.nodeToJson(node);
      cache.set(node, result);
      return result;
    };

    // 确定根元素
    const rootElement =
      document.nodeType === NodeTypeEnum.DOCUMENT_NODE ? (document as Document).body : document;

    // 将DOM转换为JSON表示
    const jsonTree = nodeToJsonWithCache(rootElement);

    // 查找潜在模板
    const templates = this.detectTemplates(jsonTree);
    // 优化模板
    const optimizedTemplates = templates.map((template) => this.analyzeTemplate(template));

    // 选择最佳模板
    const chosenTemplates = this.selectBestTemplates(optimizedTemplates);

    // 创建模板树
    const templateTree = this.buildTemplateTree(jsonTree, chosenTemplates);

    // 序列化结果
    return this.stringifyTree(templateTree, chosenTemplates);
  }

  /**
   * 从HTML字符串创建压缩版本
   * @param html HTML字符串
   * @param options 配置选项
   * @returns 压缩后的HTML字符串
   */
  public static compressHTMLString(html: string, options?: DOMShrinkerOptions): string {
    // 优化：只创建body元素而不是整个DOM，减少内存使用
    const dom = new JSDOM(html);
    return new DOMShrinker(options).compressHTML(dom.window.document.body);
  }
}
