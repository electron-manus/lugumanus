import type { StudioAction, StudioActionType } from '@lugu-manus/share';
import type { MessageStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import conversationAgentManager from '../agent/conversation-agent-manager.js';
import type { MessageStream } from '../agent/type.js';
import { browserUseToolkits } from '../toolkits/browser-user-toolkit/index.js';
import { t } from '../trpc.js';
import { removeFilterPatterns } from '../utils/filter-stream.js';
import { observableToGenerator } from '../utils/observable-to-generator.js';

const conversationRouter = t.router({
  // 创建新会话
  createConversation: t.procedure
    .input(
      z.object({
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const conversation = await ctx.prisma.conversation.create({
        data: {
          title: input.title || '新对话',
        },
      });
      return conversation;
    }),

  getAllConversations: t.procedure.query(async ({ ctx }) => {
    const conversations = await ctx.prisma.conversation.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return conversations;
  }),

  // 更新会话标题
  updateConversationTitle: t.procedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const conversation = await ctx.prisma.conversation.update({
        where: {
          id: input.id,
        },
        data: {
          title: input.title,
        },
      });
      return conversation;
    }),

  // 删除会话
  deleteConversation: t.procedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.conversation.delete({
        where: {
          id: input.id,
        },
      });
      return { success: true, id: input.id };
    }),

  subscribeConversation: t.procedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .subscription(async function* ({ input, ctx }) {
      const conversation = await ctx.prisma.conversation.findUnique({
        where: { id: input.id },
      });
      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }
      const agentContext = await conversationAgentManager.getOrCreateAgentContext(conversation.id);

      const observer = await agentContext.agent.start();
      const generator = observableToGenerator(observer, {
        bufferSize: 1,
        processBuffer: (messages) => {
          return messages.map((message) => {
            message.content = removeFilterPatterns(message.content);
            return message;
          });
        },
      });

      for await (const message of generator) {
        yield message;
      }
    }),

  previewAction: t.procedure
    .input(
      z.object({
        messageId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.prisma.message.findUnique({
        where: { id: input.messageId },
        include: {
          task: true,
        },
      });
      if (!message) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' });
      }
      const agentContext = await conversationAgentManager.getOrCreateAgentContext(
        message.conversationId,
      );

      let payload = message.task?.payload;
      if (payload) {
        try {
          payload = JSON.parse(payload);
        } catch (error) {
          payload = message.task?.payload;
        }
      }

      agentContext.agent.getStudio()?.preview({
        type: message.task?.type as StudioActionType,
        description: message.task?.description || '',
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        payload: payload as any,
      });
    }),
});

export default conversationRouter;
