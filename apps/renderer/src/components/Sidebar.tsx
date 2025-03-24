import { DeleteOutlined, EditOutlined, FolderOutlined, PlusOutlined } from '@ant-design/icons';
import { Conversations, type ConversationsProps } from '@ant-design/x';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemoizedFn } from 'ahooks';
import { Button } from 'antd';
import type React from 'react';
import { useState } from 'react';
import { trpc } from '../utils/trpc';
import ChatLogo from './ChatLogo';
import QwenModelConfigModal from './QwenModelConfigModal';

interface SidebarProps {
  onConversationChange?: (conversationId: string) => void;
  conversationId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onConversationChange, conversationId }) => {
  const [modelConfigVisible, setModelConfigVisible] = useState(false);

  const { data: conversations, refetch: refetchConversations } = useQuery(
    trpc.conversation.getAllConversations.queryOptions(),
  );
  const { mutate: deleteConversation } = useMutation(
    trpc.conversation.deleteConversation.mutationOptions({
      onSuccess: () => {
        refetchConversations();
      },
    }),
  );
  const { mutate: createConversation } = useMutation(
    trpc.conversation.createConversation.mutationOptions(),
  );

  const menuConfig: ConversationsProps['menu'] = (conversation) => ({
    items: [
      {
        label: '删除',
        key: 'delete',
        icon: <DeleteOutlined />,
        danger: true,
      },
      {
        label: '打开文件夹',
        key: 'openFolder',
        icon: <FolderOutlined />,
      },
    ],
    onClick: (menuInfo) => {
      if (menuInfo.key === 'delete') {
        deleteConversation({ id: conversation.id });
      } else if (menuInfo.key === 'openFolder') {
        // 处理打开文件夹逻辑
      }
    },
  });

  const onAddConversation = useMemoizedFn(() => {
    createConversation({ title: '新对话' });
  });

  return (
    <div className="flex flex-col h-full w-56 border-r border-gray-900">
      <div className="px-4 py-3">
        <ChatLogo />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <Button
          onClick={onAddConversation}
          type="link"
          icon={<PlusOutlined />}
          className="mb-2 hover:bg-gray-900 rounded-md w-full flex items-center justify-start px-3 py-2 text-white"
        >
          新增会话
        </Button>

        <Conversations
          menu={menuConfig}
          items={conversations?.map((conversation) => ({
            key: conversation.id,
            label: conversation.title,
            timestamp: new Date(conversation.updatedAt).getTime(),
          }))}
          activeKey={conversationId}
          onActiveChange={onConversationChange}
          className="w-full"
        />
      </div>

      <div className="mt-auto py-4 text-gray-500">
        <QwenModelConfigModal
          visible={modelConfigVisible}
          onClose={() => setModelConfigVisible(false)}
        />
        <Button
          type="text"
          onClick={() => setModelConfigVisible(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setModelConfigVisible(true);
            }
          }}
          aria-label="模型设置"
          className="text-gray-500 pb-6"
        >
          <EditOutlined className="mr-1" />
          <span>模型设置</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
function useEffect(arg0: () => void, arg1: string[]) {
  throw new Error('Function not implemented.');
}
