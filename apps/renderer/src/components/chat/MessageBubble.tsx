import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { StudioActionType } from '@lugu-manus/share';
import { useMutation } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { getActionIcon, getActionName } from '../../utils/action-display';
import { trpc } from '../../utils/trpc';

// 定义更具体的类型而不是使用any
type Task = {
  type: string;
  description: string;
};

type Message = {
  id: string;
  type: 'TASK' | 'TEXT' | string;
  content?: string;
  task?: Task;
};

type MessageBubbleProps = {
  message: Message;
};

// 提取TaskMessage组件以提高可读性
function TaskMessage({ message }: { message: Message }) {
  const mutation = useMutation(trpc.conversation.previewAction.mutationOptions());

  const handleAction = () => {
    mutation.mutate({
      messageId: message.id,
    });
  };

  return (
    <button
      className="truncate group flex items-center text-left w-full"
      onClick={handleAction}
      type="button"
      aria-label={`执行任务: ${message.task?.description}`}
    >
      <FontAwesomeIcon
        icon={getActionIcon(message.task?.type as StudioActionType)}
        className="text-current group-hover:text-inherit"
      />
      <span className="whitespace-nowrap pl-1 pr-2 text-current group-hover:text-inherit">
        {getActionName(message.task?.type as StudioActionType)}
      </span>
      <span className="whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-[#259F71]">
        {message.task?.description}
      </span>
    </button>
  );
}

function MessageBubble({ message }: MessageBubbleProps) {
  if (message.type === 'TASK') {
    return <TaskMessage message={message} />;
  }

  return (
    <div className="overflow-auto">
      <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {message.content || ''}
      </Markdown>
    </div>
  );
}

export default MessageBubble;
