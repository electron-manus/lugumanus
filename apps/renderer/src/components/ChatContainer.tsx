import { Bubble, Sender } from '@ant-design/x';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemoizedFn } from 'ahooks';
import clsx from 'clsx';
import React, { useEffect, useMemo } from 'react';
import { trpc } from '../utils/trpc';
import MessageBubble from './MessageBubble';

interface ChatContainerProps {
  conversationId?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ conversationId }) => {
  // State and Refs
  const [content, setContent] = React.useState('');
  const messagesRef = React.useRef<HTMLDivElement>(null);
  const [initialScrollHeight, setInitialScrollHeight] = React.useState<number | null>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = React.useState(true);
  const [streamMessages, setStreamMessages] = React.useState<(typeof messageStream)[]>([]);

  // Queries and Mutations
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

  // Memoized Values
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

  // Functions
  const scrollToBottom = useMemoizedFn(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setShouldScrollToBottom(false);
    }
  });

  const onSubmit = (nextContent: string) => {
    if (!nextContent || !conversationId) return;
    sendMessage({
      conversationId,
      content: nextContent,
      role: 'USER',
      type: 'TEXT',
    });
    setContent('');
  };

  const handleScroll = React.useCallback(() => {
    const container = messagesRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    setShouldScrollToBottom(
      container.scrollTop + container.clientHeight >= container.scrollHeight - 10,
    );

    if (container.scrollTop < 100) {
      setInitialScrollHeight(container.scrollHeight);
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Effects
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    if (status === 'idle') {
      refetch();
    }
  }, [status, refetch]);

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

  useEffect(() => {
    if (messages) {
      setStreamMessages([]);
      setShouldScrollToBottom(true);
    }
  }, [messages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const container = messagesRef.current;
    if (container && initialScrollHeight) {
      const newScrollTop = container.scrollHeight - initialScrollHeight;
      if (newScrollTop > 0) {
        container.scrollTop = newScrollTop;
        setInitialScrollHeight(null);
      }
    }
  }, [displayMessages.length, initialScrollHeight]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (shouldScrollToBottom && !isFetchingNextPage) {
      scrollToBottom();
    }
  }, [displayMessages.length, shouldScrollToBottom, isFetchingNextPage, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const lastDisplayMessage = displayMessages[displayMessages.length - 1];

  return (
    <div className="w-[500px] px-6">
      <div
        className={clsx('overflow-auto h-[calc(100vh-100px)] box-border pt-6 pr-6')}
        ref={messagesRef}
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <span className="text-gray-500 text-sm">正在加载更多消息...</span>
          </div>
        )}
        {displayMessages.map((it) => (
          <div key={it.id} className="mb-4 flex flex-row">
            <Bubble
              header={it.roleName}
              key={it.id}
              className="w-full"
              classNames={{
                content: '!max-w-[90%]',
              }}
              placement={it.role === 'USER' ? 'end' : 'start'}
              messageRender={(message) => <MessageBubble message={it} />}
            />
          </div>
        ))}
      </div>
      <Sender
        value={content}
        onSubmit={onSubmit}
        onChange={setContent}
        loading={
          lastDisplayMessage?.status
            ? ['PENDING', 'IDLE'].includes(lastDisplayMessage?.status)
            : false
        }
        onCancel={() => {
          // 取消当前消息
        }}
        placeholder={!conversationId ? '请选择一个会话' : '请输入你想完成的任务'}
        disabled={!conversationId}
      />
    </div>
  );
};

export default ChatContainer;
