import type { ModelType } from '@prisma/client';
import type {
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/index.mjs';
import type { FunctionDefinition } from 'openai/resources/shared.mjs';
import { lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { loadSdkAndModel } from '../ai-sdk/index.js';
import { ChatCompletion } from '../model/chat-completion.js';
import type { SpecializedToolAgent } from '../toolkits/types.js';
import type { AgentTaskRef } from './type.js';

type Message = ChatCompletionMessageParam & {
  tool_calls?: ChatCompletionMessageToolCall[];
  tool_call_id?: string;
};

export class BaseAgent {
  protected messageHistory: Array<Message> = [];
  protected systemMessage = '';
  private tools: SpecializedToolAgent[] = [];
  private temperature = 0.5;
  private readonly MAX_HISTORY_LENGTH = 30;
  private readonly MAX_TOOLS = 180;

  private uuid = uuidv4();

  protected name = '';

  constructor(options?: {
    temperature?: number;
    tools?: SpecializedToolAgent[];
  }) {
    this.temperature = options?.temperature ?? 0.5;
    this.tools = options?.tools ?? [];

    if (this.tools.length > this.MAX_TOOLS) {
      throw new Error('Too many tools');
    }
  }

  get publicMessageHistory() {
    return [...this.messageHistory];
  }

  clearMessageHistory() {
    this.systemMessage = '';
    this.messageHistory = [];
  }

  initialSystemMessage(systemMessage: string) {
    if (this.systemMessage) {
      return;
    }
    this.systemMessage = systemMessage;
    this.addToHistory('system', this.systemMessage);
  }

  addToHistory(
    role: Message['role'],
    content: string,
    taskRef?: AgentTaskRef,
    toolCalls?: ChatCompletionMessageToolCall[],
    toolCallId?: string,
  ): void {
    if (!content && !toolCalls?.length && !toolCallId) {
      return; // 避免添加空消息
    }

    const message = { role, content } as Message;

    if (toolCalls?.length) {
      message.tool_calls = toolCalls;
    }

    if (role === 'tool' && toolCallId) {
      message.tool_call_id = toolCallId;
    }

    this.messageHistory.push(message);
    this.trimMessageHistory();
  }

  private trimMessageHistory(): void {
    if (this.messageHistory.length > this.MAX_HISTORY_LENGTH) {
      // 保留系统消息，删除较早的用户和助手消息
      const systemMessages = this.messageHistory.filter((msg) => msg.role === 'system');
      const otherMessages = this.messageHistory.filter((msg) => msg.role !== 'system');
      const trimmedOtherMessages = otherMessages.slice(
        -this.MAX_HISTORY_LENGTH + systemMessages.length,
      );
      this.messageHistory = [...systemMessages, ...trimmedOtherMessages];
    }
  }

  resetMessageHistory() {
    this.messageHistory = [];
  }

  get hasToolCalls() {
    return this.messageHistory.some((message) => message.role === 'tool');
  }

  async generateResponse(
    abortSignal: AbortSignal,
    messageHistory?: Message[],
    tools?: SpecializedToolAgent[],
    params?: Partial<ChatCompletionCreateParamsStreaming>,
    model: ModelType = 'TEXT',
  ): Promise<ChatCompletion> {
    try {
      if (abortSignal.aborted) {
        throw new Error('Operation cancelled by user');
      }

      let generateParams = {} as Omit<ChatCompletionCreateParamsStreaming, 'messages' | 'model'>;
      if (tools?.length) {
        // 打印所有工具名称，用于检查格式
        console.log('Tools being sent to API:', tools.map((tool) => `"${tool.name}"`).join(', '));

        generateParams.tools = tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          } as FunctionDefinition,
        }));
      }

      if (params) {
        generateParams = {
          ...generateParams,
          ...params,
        };
      }

      const modelProvider = await loadSdkAndModel();
      const chatCompletion = await modelProvider[model].sdk.chat.completions.create(
        {
          model: modelProvider[model].model,
          messages: messageHistory ?? this.messageHistory,
          temperature: this.temperature,
          ...generateParams,
          stream: true,
        },
        {
          signal: abortSignal,
        },
      );

      return new ChatCompletion(chatCompletion);
    } catch (error) {
      if (error instanceof Error) {
        if (abortSignal.aborted) {
          throw new Error('Request was cancelled');
        }
        throw new Error(`Failed to generate response: ${error.message}`);
      }
      throw new Error('Unknown error occurred while generating response');
    }
  }

  protected async runWithTools(
    taskRef: AgentTaskRef,
    toolCalls: ChatCompletionMessageToolCall[],
    tools: SpecializedToolAgent[],
  ): Promise<Array<{ toolCall: ChatCompletionMessageToolCall; result: unknown }> | null> {
    if (!toolCalls.length || !tools.length) {
      return null;
    }

    const results = [];
    this.addToHistory('assistant', '', taskRef, toolCalls);

    for (const toolCall of toolCalls) {
      if (taskRef.abortSignal.aborted) {
        this.addToHistory('tool', 'User cancelled the operation', taskRef, undefined, toolCall.id);
        continue;
      }

      try {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;

        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
          console.error(`Tool not found: ${toolName}`);
          this.addToHistory('tool', `Tool not found: ${toolName}`, taskRef, undefined, toolCall.id);
          continue;
        }

        let parsedArgs: Record<string, unknown>;
        try {
          parsedArgs =
            typeof toolArgs === 'string'
              ? JSON.parse(toolArgs)
              : (toolArgs as Record<string, unknown>);
        } catch (e) {
          console.error(
            `Failed to parse tool arguments: ${toolName}, Error: ${(e as Error).message}, ${toolArgs}`,
          );
          this.addToHistory(
            'tool',
            `Failed to parse tool arguments: ${(e as Error).message}, ${toolArgs}`,
            taskRef,
            undefined,
            toolCall.id,
          );
          continue;
        }

        taskRef.studio.browserUse.webContentsView.setVisible(false);
        const result = await tool.execute(parsedArgs, taskRef);

        if (process.env.NODE_ENV !== 'production') {
          console.log(
            `Tool ${toolName} execution result type: ${typeof result}`,
            typeof result === 'object'
              ? `${JSON.stringify(result).substring(0, 100)}...`
              : typeof result === 'string'
                ? result.substring(0, 100)
                : result,
          );
        }

        if (result) {
          const content = typeof result === 'string' ? result : JSON.stringify(result);
          this.addToHistory('tool', content, taskRef, undefined, toolCall.id);
          results.push({ toolCall, result });
        } else {
          this.addToHistory(
            'tool',
            `Tool ${toolName} completed execution but returned no result`,
            taskRef,
            undefined,
            toolCall.id,
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Tool ${toolCall.function.name} execution failed: ${errorMessage}`);
        this.addToHistory(
          'tool',
          `Tool ${toolCall.function.name} execution failed: ${errorMessage}`,
          taskRef,
          undefined,
          toolCall.id,
        );
      }
    }

    return results.length > 0 ? results : null;
  }

  async run(
    message: Message | string,
    taskRef: AgentTaskRef,
    tools?: SpecializedToolAgent[],
    params?: Partial<ChatCompletionCreateParamsStreaming>,
    model: ModelType = 'TEXT',
  ): Promise<ChatCompletion | null> {
    if (!this.systemMessage) {
      throw new Error('System message is not set');
    }

    try {
      // 支持直接传入字符串消息
      if (typeof message === 'string') {
        this.addToHistory('user', message);
      } else {
        this.addToHistory(message.role, message.content as string);
      }

      const availableTools = tools?.length ? tools : this.tools;

      if (taskRef.abortSignal.aborted) {
        return null;
      }

      let chatCompletion: ChatCompletion | null = null;
      let toolExecutionCount = 0;
      const MAX_TOOL_EXECUTIONS = 20;

      while (!taskRef.abortSignal.aborted && toolExecutionCount < MAX_TOOL_EXECUTIONS) {
        chatCompletion = await this.generateResponse(
          taskRef.abortSignal,
          this.messageHistory,
          availableTools,
          params,
          model,
        );

        const toolCalls = await lastValueFrom(chatCompletion.toolCallsStream);
        if (!toolCalls.length) {
          break;
        }

        await this.runWithTools(taskRef, toolCalls, availableTools);
        toolExecutionCount++;
      }

      if (toolExecutionCount >= MAX_TOOL_EXECUTIONS) {
        this.addToHistory('system', 'Maximum tool execution limit reached, stopping execution');
      }

      if (chatCompletion) {
        let content = '';
        chatCompletion.contentStream.subscribe({
          next: (value) => {
            content = value;
          },
          complete: () => {
            if (content) {
              this.addToHistory('assistant', content);
            }
          },
          error: (error) => {},
        });
      }

      return chatCompletion;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Execution failed: ${errorMessage}`);
      throw new Error(`Execution failed: ${errorMessage}`);
    }
  }
}
