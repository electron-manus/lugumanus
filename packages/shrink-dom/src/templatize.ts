import { JSDOM } from 'jsdom';
import { range } from 'lodash';
type JsonNode =
  | {
      type: 'ELEMENT';
      tagName: string;
      attributes: { [key: string]: string };
      children: JsonNode[];
      templateHash: string;
      templateValues: string[];
      depth: number;
    }
  | {
      type: 'TEXT';
      content: string;
      templateHash: string;
      templateValues: [string];
      depth: 0;
    };

type PossibleTemplate = {
  hash: string;
  // definitionLength: string;
  nodes: JsonNode[];
  depth: number;
};

type OptimizedTemplate = PossibleTemplate & {
  label?: string;
  template?: string;
  valuesToInline: Set<number>;
};

type PossibleTemplates = Record<string, PossibleTemplate>;

export class HTMLTemplateProcessor {
  private domEnvironment = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  private candidateTemplates: PossibleTemplates = {};

  parseAndIdentifyTemplates(domNode: Node): JsonNode | null {
    if (domNode.nodeType === this.domEnvironment.window.Node.ELEMENT_NODE) {
      const elementNode = domNode as Element;
      const attributeMap: { [key: string]: string } = {};

      for (let attrIndex = 0; attrIndex < elementNode.attributes.length; attrIndex++) {
        const attribute = elementNode.attributes[attrIndex];
        attributeMap[attribute.name] = attribute.value;
      }

      const childrenNodes: JsonNode[] = [];

      for (const childDomNode of elementNode.childNodes) {
        const childJsonNode = this.parseAndIdentifyTemplates(childDomNode);
        if (childJsonNode) {
          childrenNodes.push(childJsonNode);
        }
      }

      const nodeDepth =
        childrenNodes.reduce((maxDepth, child) => Math.max(maxDepth, child.depth), 0) + 1;

      const templateHash = `${elementNode.tagName}#${Object.keys(
        attributeMap,
      ).sort()}#${childrenNodes.map((child) => child.templateHash).join('|')}`;

      const templateValues = Object.values(attributeMap).concat(
        childrenNodes.flatMap((child) => child.templateValues),
      );

      const jsonNode: JsonNode = {
        type: 'ELEMENT',
        tagName: elementNode.tagName,
        attributes: attributeMap,
        children: childrenNodes,
        templateHash,
        templateValues,
        depth: nodeDepth,
      };

      if (this.candidateTemplates[templateHash]) {
        if (this.candidateTemplates[templateHash].depth !== nodeDepth) {
          throw new Error(`Template depth mismatch for template ${templateHash}`);
        }
        this.candidateTemplates[templateHash].nodes.push(jsonNode);
      } else {
        this.candidateTemplates[templateHash] = {
          hash: templateHash,
          nodes: [jsonNode],
          depth: nodeDepth,
        };
      }

      return jsonNode;
    }
    if (domNode.nodeType === this.domEnvironment.window.Node.TEXT_NODE) {
      const textContent = domNode.textContent;
      if (textContent?.trim()) {
        return {
          type: 'TEXT',
          content: textContent,
          templateHash: 'TEXT',
          templateValues: [textContent],
          depth: 0,
        };
      }
    }

    return null;
  }

  private enhanceTemplateCandidate(templateCandidate: PossibleTemplate): OptimizedTemplate {
    // Find template values that are the same for all nodes
    const valuesToInline = range(templateCandidate.nodes[0].templateValues.length).filter(
      (valueIndex: number) => {
        const allValues = templateCandidate.nodes.map(
          (nodeInstance) => nodeInstance.templateValues[valueIndex],
        );
        return allValues.every((value) => value === allValues[0]);
      },
    );

    return {
      ...templateCandidate,
      valuesToInline: new Set(valuesToInline),
    };
  }

  private selectOptimalTemplates(
    optimizedTemplates: Record<string, OptimizedTemplate>,
  ): Record<string, OptimizedTemplate> {
    const selectedTemplates: Record<string, OptimizedTemplate> = {};
    const usageCountByTemplate: Record<string, number> = {};

    for (const templateEntry of Object.values(optimizedTemplates).sort(
      (template) => -template.depth,
    )) {
      // If the template isn't used in at least 3 places, don't bother
      const currentUsageCount = usageCountByTemplate[templateEntry.hash] ?? 0;
      if (templateEntry.nodes.length - currentUsageCount < 3 || templateEntry.depth < 3) {
        continue;
      }

      templateEntry.label = `T${Object.keys(selectedTemplates).length + 1}`;
      const serializedResult = this.buildTemplateStructure(
        templateEntry.nodes[0],
        selectedTemplates,
        templateEntry,
      );
      templateEntry.template = serializedResult.template;
      selectedTemplates[templateEntry.hash] = templateEntry;

      for (const usedTemplateHash of serializedResult.consumedTemplates) {
        usageCountByTemplate[usedTemplateHash] =
          (usageCountByTemplate[usedTemplateHash] ?? 0) + templateEntry.nodes.length;
      }
    }

    return selectedTemplates;
  }

  private generatePlaceholder(template: OptimizedTemplate, valueIndex: number): string {
    // valueIndex plus one minus the number of values below it that are inlined
    const inlinedValuesBefore = Array.from(template.valuesToInline).filter(
      (inlineIndex) => inlineIndex < valueIndex,
    ).length;
    const placeholderIndex = valueIndex + 1 - inlinedValuesBefore;
    return `$${placeholderIndex}`;
  }

  private buildTemplateStructure(
    nodeToProcess: JsonNode,
    selectedTemplates: Record<string, OptimizedTemplate>,
    targetTemplate: OptimizedTemplate,
    currentValueIndex = 0,
  ): { template: string; valueIndex: number; consumedTemplates: string[] } {
    if (nodeToProcess.type === 'TEXT') {
      if (targetTemplate.valuesToInline.has(currentValueIndex)) {
        return {
          template: nodeToProcess.content,
          valueIndex: currentValueIndex + 1,
          consumedTemplates: [nodeToProcess.templateHash],
        };
      }
      return {
        template: this.generatePlaceholder(targetTemplate, currentValueIndex),
        valueIndex: currentValueIndex + 1,
        consumedTemplates: [nodeToProcess.templateHash],
      };
    }

    let nextValueIndex = currentValueIndex;
    const consumedTemplates = [nodeToProcess.templateHash];

    const attributesString = Object.entries(nodeToProcess.attributes)
      .map(([attrName, attrValue], attrIndex) => {
        if (targetTemplate.valuesToInline.has(nextValueIndex + attrIndex)) {
          return ` ${attrName}="${attrValue}"`;
        }
        return ` ${attrName}=${this.generatePlaceholder(targetTemplate, nextValueIndex + attrIndex)}`;
      })
      .join('');

    nextValueIndex += Object.keys(nodeToProcess.attributes).length;

    const childrenOutput: string[] = [];
    for (const childNode of nodeToProcess.children) {
      const childResult = this.buildTemplateStructure(
        childNode,
        selectedTemplates,
        targetTemplate,
        nextValueIndex,
      );
      childrenOutput.push(childResult.template);
      nextValueIndex = childResult.valueIndex;
      consumedTemplates.push(...childResult.consumedTemplates);
    }

    const isSelfClosing = nodeToProcess.children.length === 0;
    const tagName = nodeToProcess.tagName.toLowerCase();

    return {
      template: `<${tagName}${attributesString}${
        isSelfClosing ? '/>' : `>${childrenOutput.join('')}</${tagName}>`
      }`,
      valueIndex: nextValueIndex,
      consumedTemplates,
    };
  }

  private isNumericString(value: string): boolean {
    const parsedNumber = Number.parseFloat(value);
    return !Number.isNaN(parsedNumber) && Number.isFinite(parsedNumber);
  }

  private convertTreeToString(
    rootNode: JsonNode,
    selectedTemplates: Record<string, OptimizedTemplate>,
  ): string {
    if (rootNode.type === 'TEXT') {
      return rootNode.content;
    }

    // Check if the node's templateHash matches one of the chosen templates
    if (rootNode.templateHash in selectedTemplates) {
      const matchedTemplate = selectedTemplates[rootNode.templateHash];

      return `{${matchedTemplate.label}(${rootNode.templateValues
        .filter((value, valueIndex) => !matchedTemplate.valuesToInline.has(valueIndex))
        .map((value) => (this.isNumericString(value) ? value : JSON.stringify(value)))
        .join(',')})}`;
    }

    const attributesString = Object.entries(rootNode.attributes)
      .map(([attrName, attrValue]) => ` ${attrName}="${attrValue}"`)
      .join('');

    const childrenOutput = rootNode.children
      .map((childNode) => this.convertTreeToString(childNode, selectedTemplates))
      .join('');

    const isSelfClosing = rootNode.children.length === 0;
    const tagName = rootNode.tagName.toLowerCase();

    return `<${tagName}${attributesString}${
      isSelfClosing ? '/>' : `>${childrenOutput}</${tagName}>`
    }`;
  }

  processHTML(htmlContent: string): string {
    const document = new JSDOM(htmlContent).window.document;
    const rootElement = document.documentElement;

    this.candidateTemplates = {};

    const parsedTree = this.parseAndIdentifyTemplates(rootElement);
    if (!parsedTree) return htmlContent;

    const optimizedTemplates = Object.values(this.candidateTemplates).reduce(
      (result, templateEntry) => {
        const optimizedTemplate = this.enhanceTemplateCandidate(templateEntry);
        return {
          // biome-ignore lint/performance/noAccumulatingSpread: <explanation>
          ...result,
          [optimizedTemplate.hash]: optimizedTemplate,
        };
      },
      {},
    );

    // Choose which templates to apply
    const selectedTemplates = this.selectOptimalTemplates(optimizedTemplates);

    const templateDefinitions = Object.values(selectedTemplates)
      .map((templateEntry) => `${templateEntry.label}: ${templateEntry.template}`)
      .join('\n');

    // Apply chosen templates to the tree
    const processedOutput = this.convertTreeToString(parsedTree, selectedTemplates);

    return `${templateDefinitions}\n\n${processedOutput}`;
  }
}

// 导出原始的函数接口，保持向后兼容
export default function templatize(htmlContent: string): string {
  const templateProcessor = new HTMLTemplateProcessor();
  return templateProcessor.processHTML(htmlContent);
}
