import { useMemoizedFn } from 'ahooks';
import React, { useEffect } from 'react';

export function useScrollManagement(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  messagesLength: number,
) {
  const messagesRef = React.useRef<HTMLDivElement>(null);
  const [initialScrollHeight, setInitialScrollHeight] = React.useState<number | null>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = React.useState(true);

  const scrollToBottom = useMemoizedFn(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setShouldScrollToBottom(false);
    }
  });

  const handleScroll = React.useCallback(() => {
    const container = messagesRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    setShouldScrollToBottom(
      container.scrollTop + container.clientHeight >= container.scrollHeight - 10,
    );

    if (container.scrollTop < 100) {
      setInitialScrollHeight(container.scrollHeight);
    }
  }, [hasNextPage, isFetchingNextPage]);

  // 滚动监听
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // 处理加载历史消息后的滚动位置
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
  }, [messagesLength, initialScrollHeight]);

  // 处理新消息滚动
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (shouldScrollToBottom && !isFetchingNextPage) {
      scrollToBottom();
    }
  }, [messagesLength, shouldScrollToBottom, isFetchingNextPage, scrollToBottom]);

  // 初始滚动
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return {
    messagesRef,
    shouldScrollToBottom,
    setShouldScrollToBottom,
    scrollToBottom,
    setInitialScrollHeight,
  };
}
