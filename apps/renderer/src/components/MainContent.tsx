import type React from 'react';
import { useState } from 'react';
import Sidebar from './Sidebar';
import { Studio } from './Studio';
import { ChatContainer } from './chat/ChatContainer';

const MainContent: React.FC = () => {
  const [currentConversationId, setCurrentConversationId] = useState<string>();

  return (
    <div className="flex-1 bg-[#1f1f1f] h-full flex flex-col overflow-hidden">
      <div className="flex h-full text-white overflow-hidden">
        <Sidebar
          onConversationChange={setCurrentConversationId}
          conversationId={currentConversationId}
        />
        <ChatContainer conversationId={currentConversationId} />
        <Studio />
      </div>
    </div>
  );
};

export default MainContent;
