import type { Message, MessageStatus } from '@prisma/client';
import { caller } from '../app-router.js';
import { removeFilterPatterns } from './filter-stream.js';

// 消息处理器类
export class MessageHandler {
  constructor(private readonly conversationId: string) {}

  async createMessage(roleName: string) {
    return await caller.message.addMessage({
      conversationId: this.conversationId,
      content: '',
      type: 'TEXT',
      role: 'ASSISTANT',
      status: 'PENDING',
      roleName,
    });
  }

  async completeMessage(message: Message, status: MessageStatus = 'COMPLETED') {
    await caller.message.updateMessage({
      id: message.id,
      content: removeFilterPatterns(message.content),
      status,
    });
  }

  async getIdleMessage() {
    return await caller.message.getIdleMessage({
      conversationId: this.conversationId,
    });
  }

  async updateMessageStatus(id: string, status: MessageStatus, content: string) {
    await caller.message.updateMessage({
      id,
      status,
      content,
    });
  }
}
