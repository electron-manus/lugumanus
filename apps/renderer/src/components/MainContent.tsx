import type React from 'react';
import { useState } from 'react';
import ChatContainer from './ChatContainer';
import Sidebar from './Sidebar';

const MainContent: React.FC = () => {
  const [currentConversationId, setCurrentConversationId] = useState<string>();

  return (
    <div className="flex-1 bg-[#1f1f1f] h-full flex flex-col overflow-hidden">
      <div className="flex h-full text-white overflow-hidden">
        <Sidebar
          onConversationChange={setCurrentConversationId}
          conversationId={currentConversationId}
        />
        {/* 聊天区域 */}
        <ChatContainer conversationId={currentConversationId} />
        {/* 工作室 */}
        {/* <StudioContainer /> */}
      </div>
    </div>
  );
};

export default MainContent;
