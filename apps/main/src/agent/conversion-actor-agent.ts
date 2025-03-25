import type { Message, MessageStatus } from '@prisma/client';
import type { BrowserUse } from 'electron-browser-use';
import { ReplaySubject } from 'rxjs';
import { caller } from '../app-router.js';
import { CoordinateRolePlayAgent } from './coordinate-role-play.js';
import type { AgentTaskRef } from './type.js';

export class ConversionActorAgent {
  constructor(
    private conversionId: string,
    private abortSignal: AbortSignal,
    private browserUse: BrowserUse,
  ) {}

  private coordinateRolePlay: CoordinateRolePlayAgent = new CoordinateRolePlayAgent();
  public observer = new ReplaySubject<Message>();

  async start() {
    const message = await caller.message.getIdleMessage({
      conversationId: this.conversionId,
    });
    if (!message) {
      return;
    }
    if (this.observer) {
      this.observer.error(new Error('Agent will restart'));
      this.observer.unsubscribe();
      return;
    }
    this.observer = new ReplaySubject<Message>();
    const task = message.content;

    const agentTaskRef: AgentTaskRef = {
      abortSignal: this.abortSignal,
      browserUse: this.browserUse,
      observer: this.observer,
      createMessage: async () => {
        const message = await caller.message.addMessage({
          conversationId: this.conversionId,
          content: '',
          type: 'TEXT',
          role: 'ASSISTANT',
        });
        return message;
      },
      completeMessage: async (message, status = 'COMPLETED' as MessageStatus) => {
        await caller.message.updateMessage({
          id: message.id,
          content: message.content,
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
