/**
 * DOM节点类型常量
 */
export enum NodeTypeEnum {
  ELEMENT_NODE = 1,
  TEXT_NODE = 3,
  DOCUMENT_NODE = 9,
}

/**
 * 节点的JSON表示
 */
export interface JsonNode {
  type: 'element' | 'text' | 'template';
  path?: string;
  tag?: string;
  attrs?: Record<string, string>;
  children?: JsonNode[];
  text?: string;
  templateHash?: string;
  templateId?: string;
  params?: number[];
}

/**
 * 潜在模板
 */
export interface PossibleTemplate {
  hash: string;
  structure: JsonNode;
  occurrences: JsonNode[];
  depth: number;
  path?: string;
}

/**
 * 优化后的模板
 */
export interface OptimizedTemplate {
  structure: JsonNode;
  inlineValues: Record<string, string | null>;
  occurrences: JsonNode[];
  depth: number;
  hash: string;
  path?: string;
}

/**
 * 选择的模板
 */
export interface ChosenTemplate extends OptimizedTemplate {
  id: string;
  replacements: Map<JsonNode, number[]>;
}

export interface DOMShrinkerOptions {
  minTemplateDepth?: number;
  minTemplateOccurrences?: number;
  templateIdPrefix?: string;

  // 语义标记识别选项
  semanticAttributes?: string[]; // 需要特别考虑的语义属性

  // 启发式规则选项
  useHeuristicRules?: boolean; // 是否启用启发式规则
  uiPatterns?: {
    // 自定义UI模式规则
    forms?: boolean;
    navigation?: boolean;
    cards?: boolean;
    tables?: boolean;
    custom?: Record<string, string[]>; // 自定义模式
  };

  // 语义保留选项
  semanticPreservationLevel?: 'low' | 'medium' | 'high'; // 语义保留程度
  preserveDataAttributes?: boolean; // 是否保留所有data-*属性
  preserveAriaAttributes?: boolean; // 是否保留所有aria-*属性
  preserveRoles?: boolean; // 是否保留角色属性
  criticalAttributes?: string[]; // 绝对不合并的关键属性
}

/**
 * ContentExtractor 的配置选项
 */
export interface ExtractorOptions {
  // 应被忽略的关键词列表
  skipKeywords?: string[];
  // 需要保留的HTML属性
  preservedAttributes?: string[];
  // 表单元素标签列表
  formElementTags?: string[];
  // 强调元素标签列表
  emphasisTags?: string[];
  // 简短文本的长度阈值(用于footer/small等元素判断)
  briefTextThreshold?: number;
}
