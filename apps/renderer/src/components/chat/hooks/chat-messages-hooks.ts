import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect, useMemo, useState } from 'react';
import { trpc } from '../../../utils/trpc';

export function useChatMessages(conversationId?: string) {
  const [streamMessages, setStreamMessages] = useState<(typeof messageStream)[]>([]);

  const {
    data: messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery(
    trpc.message.getMessagesByConversation.infiniteQueryOptions(
      { conversationId },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: !!conversationId,
      },
    ),
  );

  const flatMessages = messages?.pages.flatMap((page) => page.items) ?? [];
  const lastMessage = flatMessages[flatMessages.length - 1];

  const { data: messageStream, status } = useSubscription(
    trpc.conversation.subscribeConversation.subscriptionOptions(
      {
        id: conversationId as string,
      },
      {
        enabled: lastMessage?.status === 'IDLE',
      },
    ),
  );

  const { mutate: sendMessage } = useMutation(
    trpc.message.addMessage.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );

  // 处理消息流更新
  useEffect(() => {
    if (messageStream?.id) {
      setStreamMessages((prev) => {
        const existingIndex = prev.findIndex((msg) => msg?.id === messageStream.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = messageStream;
          return updated;
        }
        return [...prev, messageStream];
      });
    }
  }, [messageStream]);

  // 重置消息流
  useEffect(() => {
    if (messages) {
      setStreamMessages([]);
    }
  }, [messages]);

  // 状态变更处理
  useEffect(() => {
    if (status === 'idle') {
      refetch();
    }
  }, [status, refetch]);

  // 合并普通消息和流消息
  const displayMessages = useMemo(() => {
    if (!streamMessages.length) return flatMessages;
    const messages = [...flatMessages];
    for (const streamMsg of streamMessages) {
      if (!streamMsg?.id) continue;
      const existingIndex = messages.findIndex((msg) => msg.id === streamMsg.id);
      if (existingIndex >= 0) {
        messages[existingIndex] = {
          ...messages[existingIndex],
          ...streamMsg,
        };
      } else {
        messages.push(streamMsg);
      }
    }
    return messages;
  }, [flatMessages, streamMessages]);

  return {
    displayMessages,
    sendMessage,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    lastMessage: displayMessages[displayMessages.length - 1],
  };
}
