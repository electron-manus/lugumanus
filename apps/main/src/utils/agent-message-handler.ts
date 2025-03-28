import type { Message, MessageStatus, MessageType, Task } from '@prisma/client';
import { caller } from '../app-router.js';
import { removeFilterPatterns } from './filter-stream.js';

// 消息处理器类
export class MessageHandler {
  constructor(private readonly conversationId: string) {}

  async createMessage(roleName: string, taskId?: string, type: MessageType = 'TEXT') {
    return await caller.message.addMessage({
      conversationId: this.conversationId,
      content: '',
      type,
      role: 'ASSISTANT',
      status: 'PENDING',
      roleName,
      taskId,
    });
  }

  async createTask(task: Pick<Task, 'type' | 'description' | 'payload'>) {
    return await caller.task.createTask({
      type: task.type,
      description: task.description,
      payload: task.payload,
    });
  }

  async completeTask(task: Task) {
    await caller.task.updateTask({
      id: task.id,
      payload: task.payload,
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
