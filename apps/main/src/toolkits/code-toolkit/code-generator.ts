import yaml from 'js-yaml';
import { lastValueFrom } from 'rxjs';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';

export class CodeGeneratorAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'CodeGeneratorTool';

  description = 'A tool for generating code based on specifications';

  parameters = {
    type: 'object',
    properties: {
      language: {
        type: 'string',
        description: 'Programming language to generate code in',
        default: 'javascript',
      },
      specification: {
        type: 'string',
        description: 'Description of what the code should do',
      },
    },
    required: ['specification'],
  };

  strict = true;

  async execute(query: Record<string, unknown>, taskRef: AgentTaskRef): Promise<string> {
    const language = (query.language as string) || 'javascript';
    const specification = query.specification as string;

    this.initialSystemMessage(
      `You are a ${language} developer. You are responsible for generating code based on the given specification.`,
    );

    try {
      // Use AI large language model to generate code
      const prompt = this.createGenerationPrompt(language, specification);
      const generatedCode = await this.run(prompt, taskRef, [], {}, 'CODE');

      if (!generatedCode) {
        throw new Error('No code generated');
      }

      await taskRef.studio.startWithStream(
        {
          type: 'editor',
          description: 'Generate code',
          payload: '',
        },
        generatedCode,
        taskRef.observer,
      );

      return yaml.dump({
        success: true,
        language,
        code: await lastValueFrom(generatedCode.contentStream),
        message: 'Code generated successfully',
      });
    } catch (error) {
      return yaml.dump({
        success: false,
        error: String(error),
      });
    }
  }

  private createGenerationPrompt(language: string, specification: string): string {
    let prompt = `Generate ${language} code for the following specification:\n${specification}\n\n`;

    prompt += `\nReturn only the ${language} code without additional explanations.`;
    return prompt;
  }
}
