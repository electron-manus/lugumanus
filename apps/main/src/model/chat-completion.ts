import type OpenAI from 'openai';
import type { ChatCompletionChunk } from 'openai/resources/index.mjs';
import { ReplaySubject, firstValueFrom, lastValueFrom } from 'rxjs';

export class ChatCompletion {
  private content = '';
  private toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];
  private isStream: boolean;
  private streamResponse?: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  private contentSubject: ReplaySubject<string> = new ReplaySubject<string>();
  private toolCallsSubject: ReplaySubject<OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]> =
    new ReplaySubject<OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]>();
  private completedSubject: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
  private processingPromise: Promise<void> | null = null;
  private errorSubject: ReplaySubject<Error> = new ReplaySubject<Error>(1);

  constructor(
    private chatCompletion:
      | OpenAI.Chat.Completions.ChatCompletion
      | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  ) {
    this.isStream = Symbol.asyncIterator in chatCompletion;

    if (this.isStream) {
      this.streamResponse =
        chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      this.processingPromise = this._processStream();
    } else {
      const completion = this.chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
      this.content = completion.choices[0]?.message?.content || '';
      this.toolCalls = completion.choices[0]?.message?.tool_calls || [];
      this.contentSubject.next(this.content);
      this.toolCallsSubject.next(this.toolCalls);
      this.completedSubject.next(true);
    }
  }

  // 处理流式响应
  private async _processStream(): Promise<void> {
    if (!this.streamResponse) {
      throw new Error('Stream response is not available');
    }

    try {
      let hasToolCalls = false;
      let hasContent = false;

      for await (const chunk of this.streamResponse) {
        // 处理工具调用
        if (chunk.choices[0]?.delta?.tool_calls) {
          if (!hasToolCalls && !hasContent) {
            hasToolCalls = true;
            // 如果首次检测到工具调用，内容应为空，直接调用工具
            this.contentSubject.next('');
            this.contentSubject.complete();
          }

          this._processToolCallsChunk(chunk.choices[0].delta.tool_calls);
          this.toolCallsSubject.next([...this.toolCalls]);
        }

        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          if (!hasContent && !hasToolCalls) {
            hasContent = true;
            // 如果首次检测到内容，工具调用应为空
            this.toolCallsSubject.next([]);
            this.toolCallsSubject.complete();
          }

          this.content += content;
          this.contentSubject.next(this.content);
        }

        // 检查是否有完成标志
        if (chunk.choices[0]?.finish_reason) {
          console.log('stream completed: ', chunk.choices[0].finish_reason);
        }
      }

      // 修复可能不完整的JSON参数
      this._validateAndFixToolCalls();
      // 流处理完成
      this.completedSubject.next(true);
    } catch (error) {
      console.error('Error processing stream:', error);
      this.errorSubject.next(error as Error);
      this.completedSubject.error(error);
    } finally {
      this.errorSubject.complete();
      this.completedSubject.complete();
      this.contentSubject.complete();
      this.toolCallsSubject.complete();
    }
  }

  // 添加新方法验证和修复工具调用参数
  private _validateAndFixToolCalls(): void {
    for (const toolCall of this.toolCalls) {
      if (toolCall.function?.arguments) {
        try {
          // 尝试解析JSON
          JSON.parse(toolCall.function.arguments);
        } catch (e) {
          // JSON不完整，尝试修复
          console.warn('detected incomplete JSON parameters:', toolCall.function.arguments);
          // 可能缺少结束括号
          if (!toolCall.function.arguments.endsWith('}')) {
            toolCall.function.arguments += '}';
            // 再次尝试解析
            try {
              JSON.parse(toolCall.function.arguments);
              console.log('fixed JSON parameters:', toolCall.function.arguments);
            } catch (e) {
              // 如果还是不行，可能缺少多个括号
              toolCall.function.arguments += '"}';
              try {
                JSON.parse(toolCall.function.arguments);
                console.log('fixed complex JSON parameters:', toolCall.function.arguments);
              } catch (e) {
                console.error('failed to fix JSON parameters');
              }
            }
          }
        }
      }
    }
  }

  // 获取内容流
  get contentStream() {
    return this.contentSubject.asObservable();
  }

  // 获取工具调用流
  get toolCallsStream() {
    return this.toolCallsSubject.asObservable();
  }

  // 获取完成状态流
  get completed() {
    return this.completedSubject.asObservable();
  }

  // 获取错误流
  get error() {
    return this.errorSubject.asObservable();
  }

  // 等待并获取完整响应
  async getFullContent(): Promise<string> {
    if (this.isStream && this.processingPromise) {
      await lastValueFrom(this.completed);
    }
    return this.content;
  }

  // 等待并获取所有工具调用
  async getFullToolCalls(): Promise<OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]> {
    if (this.isStream && this.processingPromise) {
      try {
        // 等待流处理完成
        await this.processingPromise;
        // 再次检查并修复工具调用
        this._validateAndFixToolCalls();
      } catch (error) {
        console.error('error occurred while waiting for stream processing to complete:', error);
      }
    }
    return this.toolCalls;
  }

  private _processToolCallsChunk(toolCallsChunk: ChatCompletionChunk.Choice.Delta.ToolCall[]) {
    for (let i = 0; i < toolCallsChunk.length; i++) {
      const toolCallChunk = toolCallsChunk[i];
      const { index, function: func } = toolCallChunk;

      // 查找现有工具调用或创建新的
      let existingToolCall = this.toolCalls[index];
      if (!existingToolCall) {
        existingToolCall = {
          id: toolCallChunk.id || `call_${index}`,
          type: 'function',
          function: { name: '', arguments: '' },
        };
        this.toolCalls[index] = existingToolCall;
      }

      if (func?.name) {
        existingToolCall.function.name += func.name;
      }
      if (func?.arguments) {
        existingToolCall.function.arguments += func.arguments;
      }
    }
  }

  get messages() {
    return !this.isStream
      ? (this.chatCompletion as OpenAI.Chat.Completions.ChatCompletion).choices.map(
          (choice) => choice.message,
        )
      : [
          {
            role: 'assistant',
            content: this.content,
            tool_calls: this.toolCalls.length > 0 ? this.toolCalls : undefined,
          },
        ];
  }

  get message() {
    return this.messages[0];
  }

  get usage() {
    return !this.isStream
      ? ((this.chatCompletion as OpenAI.Chat.Completions.ChatCompletion).usage ?? {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        })
      : {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        };
  }
}
