import { MessageRole, MessageStatus, MessageType } from '@prisma/client';
import { z } from 'zod';
import { t } from '../trpc.js';

const messageRouter = t.router({
  // 添加消息到会话
  addMessage: t.procedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string(),
        role: z.nativeEnum(MessageRole),
        type: z.nativeEnum(MessageType),
        taskId: z.string().optional(),
        status: z.nativeEnum(MessageStatus).optional(),
        roleName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          content: input.content,
          role: input.role,
          type: input.type,
          taskId: input.taskId,
          status: input.status || 'IDLE',
          roleName: input.roleName || 'User',
        },
        include: {
          task: true,
        },
      });

      // 更新会话的updatedAt时间
      await ctx.prisma.conversation.update({
        where: {
          id: input.conversationId,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      return message;
    }),

  // 更新消息
  updateMessage: t.procedure
    .input(
      z.object({
        id: z.string(),
        content: z.string(),
        status: z.nativeEnum(MessageStatus),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.message.update({
        where: {
          id: input.id,
        },
        data: {
          content: input.content,
          status: input.status,
        },
      });
    }),

  // 删除消息
  deleteMessage: t.procedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.message.delete({
        where: {
          id: input.id,
        },
      });
      return { success: true };
    }),

  // 基于游标分页获取会话消息
  getMessagesByConversation: t.procedure
    .input(
      z.object({
        conversationId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20), // 每页消息数量
        cursor: z.string().optional(), // 游标，用于分页
      }),
    )
    .query(async ({ input, ctx }) => {
      const { conversationId, limit, cursor } = input;
      if (!conversationId) {
        return {
          items: [],
          nextCursor: undefined,
        };
      }
      // 获取消息列表
      const messages = await ctx.prisma.message.findMany({
        include: {
          task: true,
        },
        where: {
          conversationId,
        },
        take: limit + 1, // 多获取一条用于确定是否有下一页
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: 'asc', // 按创建时间降序排列，最新的消息在前
        },
      });

      let nextCursor: string | undefined = undefined;

      // 如果结果数量超过请求的限制，说明有下一页
      if (messages.length > limit) {
        // 移除额外获取的项
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: messages,
        nextCursor,
      };
    }),

  getIdleMessage: t.procedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const message = await ctx.prisma.message.findFirst({
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          task: true,
        },
      });

      return message;
    }),
});

export default messageRouter;
