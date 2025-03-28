import { faFile, faFolder } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';

// 添加 FolderPreview 组件
export function FolderPreview({
  folder,
}: {
  folder: {
    name: string;
    type: 'file' | 'folder';
  }[];
}) {
  return (
    <div className="folder-preview">
      <ul className="space-y-2">
        {folder.map((file, index) => (
          <li key={file.name} className="flex items-center p-2 hover:bg-gray-700 rounded">
            <FontAwesomeIcon
              icon={file.type === 'folder' ? faFolder : faFile}
              className={clsx('mr-3 text-2xl', {
                'text-yellow-400': file.type === 'folder',
                'text-blue-400': file.type === 'file',
              })}
            />
            <span>{file.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
