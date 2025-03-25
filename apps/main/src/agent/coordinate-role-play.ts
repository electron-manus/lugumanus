import { lastValueFrom } from 'rxjs';
import type { ChatCompletion } from '../model/chat-completion.js';
import {
  coordinatingUserPrompt,
  startCoordinatingRunnerPrompt,
  toCoordinatingNextInstructionPrompt,
  toFinalAnswerPrompt,
} from '../prompt/index.js';
import { BaseAgent } from './base-agent.js';
import { DialogueAgent } from './dialogue-agent.js';
import type { AgentTaskRef } from './type.js';

export class CoordinateRolePlayAgent {
  private roleAgent: BaseAgent = new BaseAgent({
    temperature: 0,
    tools: [new DialogueAgent()],
  });

  async play(task: string, taskRef: AgentTaskRef) {
    const { abortSignal } = taskRef;
    if (!abortSignal) {
      throw new Error('abortSignal is required');
    }
    this.roleAgent.initialSystemMessage(coordinatingUserPrompt(task));
    let message = startCoordinatingRunnerPrompt();
    let assistantCompletion: ChatCompletion | null = null;

    while (true) {
      assistantCompletion = await this.roleAgent.run(message, taskRef);
      if (!assistantCompletion) {
        break;
      }

      const messageModel = await taskRef.createMessage('Coordinate Agent');
      taskRef.observer.next(messageModel);
      assistantCompletion.contentStream.subscribe({
        next: (value) => {
          messageModel.content = value;
          taskRef.observer.next(messageModel);
        },
        async complete() {
          await taskRef.completeMessage(messageModel);
          taskRef.observer.complete();
        },
        error: (error) => {
          taskRef.completeMessage(messageModel, 'FAILED');
          taskRef.observer.error(error);
        },
      });

      message = await lastValueFrom(assistantCompletion.contentStream);
      if (message.includes('TASK_DONE')) {
        message += toFinalAnswerPrompt(task);
        assistantCompletion = await this.roleAgent.run(message, taskRef);
        break;
      }

      message += toCoordinatingNextInstructionPrompt();
    }

    return assistantCompletion;
  }
}
