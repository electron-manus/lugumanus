import { Sender } from '@ant-design/x';
import React from 'react';

// 输入组件
export const ChatInput = React.memo(
  ({
    onSubmit,
    loading,
    conversationId,
  }: {
    onSubmit: (content: string) => void;
    loading: boolean;
    conversationId?: string;
  }) => {
    const [content, setContent] = React.useState('');

    const handleSubmit = (nextContent: string) => {
      if (!nextContent) return;
      onSubmit(nextContent);
      setContent('');
    };

    return (
      <div className="pb-10">
        <Sender
          value={content}
          onSubmit={handleSubmit}
          onChange={setContent}
          loading={loading}
          onCancel={() => {
            // 取消当前消息
          }}
          placeholder={!conversationId ? '请选择一个会话' : '请输入你想完成的任务'}
          disabled={!conversationId}
        />
      </div>
    );
  },
);
