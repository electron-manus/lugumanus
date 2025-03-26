import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { StudioActionForRenderer } from '@lugu-manus/share';
import { useMemoizedFn } from 'ahooks';
import type { IpcRendererEvent } from 'electron';
import { useEffect, useState } from 'react';
import { Unless, When } from 'react-if';
import { getActionIcon, getActionName } from '../utils/action-display';
import StudioPreview from './studio/StudioPreview';

declare global {
  interface Window {
    Main: {
      on: (
        event: string,
        callback: (event: IpcRendererEvent, data: StudioActionForRenderer) => void,
      ) => void;
      off: (
        event: string,
        callback: (event: IpcRendererEvent, data: StudioActionForRenderer) => void,
      ) => void;
    };
  }
}

export const Studio = () => {
  const [action, setAction] = useState<StudioActionForRenderer | null>(null);
  const studioHandler = useMemoizedFn((event: IpcRendererEvent, data: StudioActionForRenderer) =>
    setAction(data),
  );

  useEffect(() => {
    window.Main?.on?.('studio', studioHandler);
    return () => {
      window.Main?.off?.('studio', studioHandler);
    };
  }, [studioHandler]);

  return (
    <div className="w-[1200px] h-full">
      <div className="bg-[#2c2b2b25] rounded-lg h-full p-4 flex-col flex relative">
        <div className="font-bold text-lg">小麓咕的创作室</div>
        <When condition={Boolean(action)}>
          <div className="pt-2 flex items-center gap-2">
            <div className="p-3 bg-gradient-to-tl from-gray-900 to-gray-800 rounded-md py-2">
              <FontAwesomeIcon icon={getActionIcon(action?.type)} />
            </div>
            <div className="gap-2">
              <div className="text-sm text-gray-400">
                小麓咕正在使用
                <span className="font-bold text-gray-100 pl-1">{getActionName(action?.type)}</span>
              </div>
              <div className="text-sm text-gray-400 bg-gray-900 p-2 rounded-md mt-2 truncate">
                小麓咕正在{getActionName(action?.type)} {action?.description}
              </div>
            </div>
          </div>
        </When>
        <Unless condition={Boolean(action)}>
          <div className="pt-2">
            <div className="text-sm text-gray-400">小麓咕现在非常的空闲</div>
          </div>
        </Unless>
        <div className="pt-3 flex-1 overflow-hidden">
          <div className="border overflow-hidden border-solid border-gray-900 rounded-2xl h-full flex flex-col">
            <div className="text-sm text-gray-400 p-2 text-center bg-[#141414] truncate">
              {action?.description || '小麓咕暂无任务...'}
            </div>
            <div className="flex-1 overflow-hidden">
              <div id="studio" className="h-full flex items-center justify-center">
                <StudioPreview action={action} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
