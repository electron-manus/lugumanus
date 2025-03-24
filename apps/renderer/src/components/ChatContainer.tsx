import { Bubble, Sender } from '@ant-design/x';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemoizedFn } from 'ahooks';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import { trpc } from '../utils/trpc';
import MessageBubble from './MessageBubble';

interface ChatContainerProps {
  conversationId?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ conversationId }) => {
  const queryClient = useQueryClient();
  const {
    data: messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    trpc.message.getMessagesByConversation.infiniteQueryOptions(
      { conversationId },
      { getNextPageParam: (lastPage) => lastPage.nextCursor, enabled: !!conversationId },
    ),
  );

  const flatMessages = messages?.pages.flatMap((page) => page.items) ?? [];

  const [currentMessage, setCurrentMessage] = useState<(typeof flatMessages)[number] | null>(null);

  const { mutate: sendMessage } = useMutation(
    trpc.message.addMessage.mutationOptions({
      onSuccess: (message) => {
        queryClient.invalidateQueries({
          queryKey: trpc.message.getMessagesByConversation.queryKey({ conversationId }),
        });

        setCurrentMessage(message);
        setShouldScrollToBottom(true);
      },
    }),
  );

  const [content, setContent] = React.useState('');
  const messagesRef = React.useRef<HTMLDivElement>(null);
  const [initialScrollHeight, setInitialScrollHeight] = React.useState<number | null>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = React.useState(true);

  // 滚动到底部
  const scrollToBottom = useMemoizedFn(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
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

  // 向上滚动加载更多消息
  const handleScroll = React.useCallback(() => {
    const container = messagesRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    // 当用户手动滚动时，不自动滚动到底部
    setShouldScrollToBottom(
      container.scrollTop + container.clientHeight >= container.scrollHeight - 10,
    );

    // 当滚动到顶部附近时（距离顶部小于100px）加载更多
    if (container.scrollTop < 100) {
      // 记录当前滚动高度以便后续维持相对滚动位置
      setInitialScrollHeight(container.scrollHeight);
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 监听滚动事件
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 加载更多消息后保持滚动位置
  useEffect(() => {
    const container = messagesRef.current;
    if (container && initialScrollHeight) {
      const newScrollTop = container.scrollHeight - initialScrollHeight;
      if (newScrollTop > 0) {
        container.scrollTop = newScrollTop;
        setInitialScrollHeight(null);
      }
    }
  }, [flatMessages.length, initialScrollHeight]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 初次加载和消息更新后滚动到底部
  useEffect(() => {
    if (shouldScrollToBottom && !isFetchingNextPage) {
      scrollToBottom();
    }
  }, [flatMessages.length, shouldScrollToBottom, isFetchingNextPage, scrollToBottom]);

  // 组件挂载后滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const renderMessages = useMemo(() => {
    if (!currentMessage) {
      return flatMessages;
    }
    return [...flatMessages, currentMessage];
  }, [flatMessages, currentMessage]);

  return (
    <div className="w-[500px] px-6">
      <div className={clsx('overflow-auto h-[calc(100vh-100px)]')} ref={messagesRef}>
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <span className="text-gray-500 text-sm">正在加载更多消息...</span>
          </div>
        )}
        {renderMessages.map((it) => (
          <div key={it.id} className="mb-4 flex flex-row">
            <Bubble
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
          currentMessage?.status ? ['PENDING', 'IDLE'].includes(currentMessage?.status) : false
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
