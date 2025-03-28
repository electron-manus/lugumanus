import type { StudioActionForRenderer } from '@lugu-manus/share';
import { Image } from 'antd';
import clsx from 'clsx';
import EditorPreview from './EditorPreview';
import { FolderPreview } from './FolderPreview';
import ListPreview from './ListPreview';

function Padding({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('p-6', className)}>{children}</div>;
}

function StudioPreview({ action }: { action: StudioActionForRenderer | null }) {
  // 渲染内容基于 action 类型
  const renderContent = () => {
    if (!action) return null;

    switch (action.type) {
      case 'searchResults':
        return (
          <Padding>
            <ListPreview search={action.payload.query} data={action.payload.searchResults} />
          </Padding>
        );
      case 'editor':
        return <EditorPreview content={action.payload as string} />;
      case 'image':
        return (
          <Padding className="flex items-center justify-center">
            <Image className="max-h-96 max-w-96" src={action.payload.url} preview />
          </Padding>
        );
      case 'openFolder':
        return (
          <Padding>
            <FolderPreview folder={action.payload} />
          </Padding>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={clsx('h-full w-full overflow-auto bg-gray-900 bg-opacity-35', {
        'animate-pulse': !action,
      })}
    >
      {renderContent()}
    </div>
  );
}

export default StudioPreview;
