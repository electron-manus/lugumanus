import { Bubble } from '@ant-design/x';
import { useMemoizedFn } from 'ahooks';
import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  messages: any[];
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  hasNextPage: boolean;
}

export const MessageList = React.memo(
  ({ messages, isFetchingNextPage, onLoadMore, hasNextPage }: MessageListProps) => {
    const messagesRef = useRef<HTMLDivElement>(null);

    const handleScroll = useMemoizedFn(() => {
      const container = messagesRef.current;
      if (!container || !hasNextPage || isFetchingNextPage) return;

      // 当滚动到顶部附近时，触发加载更多
      if (container.scrollTop < 100) {
        onLoadMore();
      }
    });

    useEffect(() => {
      const container = messagesRef.current;
      if (!container) return;

      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }, [handleScroll]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
      const container = messagesRef.current;
      if (!container) return;

      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }, [messages.length, messages[messages.length - 1]?.content]);

    return (
      <div
        className={clsx('overflow-auto h-[calc(100vh-100px)] box-border pt-6 pr-6')}
        ref={messagesRef}
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <span className="text-gray-500 text-sm">正在加载更多消息...</span>
          </div>
        )}
        {messages.map((it) => (
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
    );
  },
);
