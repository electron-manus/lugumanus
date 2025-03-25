import { lastValueFrom } from 'rxjs';
import {
  addAuxiliaryInformationPrompt,
  assistantPrompt,
  startRunnerPrompt,
  toFinalAnswerPrompt,
  toNextInstructionPrompt,
  userPrompt,
} from '../prompt/index.js';
import { searchToolkit } from '../toolkits/search-toolkit/index.js';
import type { SpecializedToolAgent } from '../toolkits/types.js';
import { webPageSummaryToolkit } from '../toolkits/web-page-summary/index.js';
import { BaseAgent } from './base-agent.js';
import type { AgentTaskRef } from './type.js';

type Parameters = {
  question: string;
  expected_result: string;
  context?: string;
};

export class DialogueAgent extends BaseAgent implements SpecializedToolAgent {
  readonly name = 'dialogue assistant';
  readonly description = 'A dialogue assistant that can help you with your questions.';
  readonly parameters = {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The question to ask the assistant.' },
      expected_result: {
        type: 'string',
        description: 'The expected result of the question.',
      },
      context: {
        type: 'string',
        description: 'The context of the question.',
      },
    },
    required: ['question', 'expected_result'],
  };

  readonly strict = true;

  private userAgent = new BaseAgent({
    temperature: 0.5,
  });

  private assistantAgent = new BaseAgent({
    temperature: 0,
    tools: [...searchToolkit, ...webPageSummaryToolkit],
  });

  static readonly MAX_ITERATIONS = 30;

  constructor() {
    super({
      temperature: 0,
      tools: [],
    });
  }

  async execute(query: Parameters, taskRef: AgentTaskRef): Promise<string> {
    this.userAgent.initialSystemMessage(userPrompt(query.question));
    this.assistantAgent.initialSystemMessage(
      assistantPrompt(query.question, query.expected_result, query.context),
    );

    if (taskRef.abortSignal.aborted) {
      return 'The task has been aborted.';
    }

    let initialMessage = startRunnerPrompt();
    for (let index = 0; index < DialogueAgent.MAX_ITERATIONS; index++) {
      if (taskRef.abortSignal.aborted) {
        return 'The task has been aborted.';
      }
      const discussionResult = await this.discussTask(initialMessage, taskRef, query);
      if (!discussionResult) {
        continue;
      }
      const [userAgentContent, assistantAgentContent] = discussionResult;
      if (userAgentContent.includes('TASK_DONE')) {
        return assistantAgentContent;
      }
      initialMessage = assistantAgentContent;
    }

    return '';
  }

  async discussTask(
    message: string,
    taskRef: AgentTaskRef,
    query: Parameters,
  ): Promise<[string, string] | null> {
    const userAgentCompletion = await this.userAgent.run(message, taskRef);
    if (!userAgentCompletion) {
      return null;
    }

    let messageModel = await taskRef.createMessage('User Agent');
    taskRef.observer.next(messageModel);
    userAgentCompletion.contentStream.subscribe({
      next: (chunk) => {
        messageModel.content = chunk;
        taskRef.observer.next(messageModel);
      },
      async complete() {
        await taskRef.completeMessage(messageModel);
        taskRef.observer.next(messageModel);
      },
      error(err) {
        taskRef.completeMessage(messageModel, 'FAILED');
        taskRef.observer.next(messageModel);
      },
    });

    let userAgentContent = await lastValueFrom(userAgentCompletion.contentStream);

    if (userAgentContent.includes('TASK_DONE')) {
      userAgentContent += toFinalAnswerPrompt(query.question);
    } else {
      userAgentContent += addAuxiliaryInformationPrompt(query.question);
    }

    const assistantAgentCompletion = await this.assistantAgent.run(userAgentContent, taskRef);
    if (!assistantAgentCompletion) {
      return null;
    }

    messageModel = await taskRef.createMessage('Assistant Agent');
    taskRef.observer.next(messageModel);
    assistantAgentCompletion.contentStream.subscribe({
      next: (chunk) => {
        messageModel.content = chunk;
        taskRef.observer.next(messageModel);
      },
      complete() {
        taskRef.completeMessage(messageModel);
        taskRef.observer.next(messageModel);
      },
      error() {
        taskRef.completeMessage(messageModel, 'FAILED');
        taskRef.observer.next(messageModel);
      },
    });

    let assistantAgentContent = await lastValueFrom(assistantAgentCompletion.contentStream);

    if (!userAgentContent.includes('TASK_DONE')) {
      assistantAgentContent += toNextInstructionPrompt(userAgentContent);
    }

    return [userAgentContent, assistantAgentContent];
  }
}
