import type React from 'react';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { useChatMessages } from './hooks/chat-messages-hooks';

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

  const handleSendMessage = (content: string) => {
    if (!conversationId) return;
    sendMessage({
      conversationId,
      content,
      role: 'USER',
      type: 'TEXT',
    });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const isLoading = lastMessage?.status ? ['PENDING', 'IDLE'].includes(lastMessage?.status) : false;

  return (
    <div className="w-[496px] px-6 flex flex-col">
      <MessageList
        messages={displayMessages}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={handleLoadMore}
        hasNextPage={!!hasNextPage}
      />
      <ChatInput onSubmit={handleSendMessage} loading={isLoading} conversationId={conversationId} />
    </div>
  );
};
