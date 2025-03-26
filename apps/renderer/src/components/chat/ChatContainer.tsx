import type React from 'react';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { useChatMessages } from './hooks/chat-messages-hooks';
import { useScrollManagement } from './hooks/scroll-management';

interface ChatContainerProps {
  conversationId?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ conversationId }) => {
  const {
    displayMessages,
    sendMessage,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    lastMessage,
  } = useChatMessages(conversationId);

  const { messagesRef, setShouldScrollToBottom, setInitialScrollHeight } = useScrollManagement(
    !!hasNextPage,
    isFetchingNextPage,
    displayMessages.length,
  );

  const handleSendMessage = (content: string) => {
    if (!conversationId) return;
    sendMessage({
      conversationId,
      content,
      role: 'USER',
      type: 'TEXT',
    });
    setShouldScrollToBottom(true);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      setInitialScrollHeight(messagesRef.current?.scrollHeight || null);
      fetchNextPage();
    }
  };

  const isLoading = lastMessage?.status ? ['PENDING', 'IDLE'].includes(lastMessage?.status) : false;

  return (
    <div className="w-[496px] px-6">
      <MessageList
        messages={displayMessages}
        messagesRef={messagesRef as React.RefObject<HTMLDivElement>}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={handleLoadMore}
        hasNextPage={!!hasNextPage}
      />
      <ChatInput onSubmit={handleSendMessage} loading={isLoading} conversationId={conversationId} />
    </div>
  );
};
