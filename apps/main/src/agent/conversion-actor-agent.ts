import type { MessageStatus } from '@prisma/client';
import type { BrowserUse } from 'electron-browser-use';
import { ReplaySubject } from 'rxjs';
import { caller } from '../app-router.js';
import { removeFilterPatterns } from '../utils/filter-stream.js';
import { CoordinateRolePlayAgent } from './coordinate-role-play.js';
import type { AgentTaskRef, MessageStream } from './type.js';

export class ConversionActorAgent {
  constructor(
    private conversionId: string,
    private abortSignal: AbortSignal,
    private browserUse: BrowserUse,
    private observer = new ReplaySubject<MessageStream>(),
  ) {}

  private coordinateRolePlay: CoordinateRolePlayAgent = new CoordinateRolePlayAgent();

  getObserver() {
    return this.observer.asObservable();
  }

  async start() {
    const message = await caller.message.getIdleMessage({
      conversationId: this.conversionId,
    });
    if (!message || message.status !== 'IDLE') {
      return this.observer.asObservable();
    }

    await caller.message.updateMessage({
      id: message.id,
      status: 'PENDING',
      content: message.content,
    });

    if (this.observer) {
      this.observer.complete();
      this.observer.unsubscribe();
    }

    this.observer = new ReplaySubject<MessageStream>();
    const task = message.content;
    const agentTaskRef: AgentTaskRef = {
      abortSignal: this.abortSignal,
      browserUse: this.browserUse,
      observer: this.observer,
      createMessage: async (roleName: string) => {
        const message = await caller.message.addMessage({
          conversationId: this.conversionId,
          content: '',
          type: 'TEXT',
          role: 'ASSISTANT',
          status: 'PENDING',
          roleName,
        });
        return message;
      },
      completeMessage: async (message, status = 'COMPLETED' as MessageStatus) => {
        await caller.message.updateMessage({
          id: message.id,
          content: removeFilterPatterns(message.content),
          status,
        });
      },
    };

    this.coordinateRolePlay
      .play(task, agentTaskRef)
      .then(() => {
        this.observer.complete();
      })
      .catch((error) => {
        this.observer.error(error);
      });

    return this.observer.asObservable();
  }
}
