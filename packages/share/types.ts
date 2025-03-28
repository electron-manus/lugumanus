export type CollectItemMetadata = {
  name?: string;
  timestamp?: number;
  source?: string;
};

// Studio 动作类型
export type StudioActionType =
  | 'openFile'
  | 'openFolder'
  | 'openUrl'
  | 'executeBrowserAction'
  | 'image'
  | 'editor'
  | 'searchResults'
  | 'collect';

export type PreviewListItem = {
  title: string;
  url?: string;
  description?: string;
  avatar?: string;
};

// 提取通用的Payload类型
export type ShowTextPayload = { text: string };
export type ShowImagePayload = { url: string };
export type ShowSearchResultsPayload = {
  query: string;
  searchResults: Array<PreviewListItem>;
};

export type CommonAction =
  | { type: 'editor'; payload: unknown; description: string }
  | { type: 'image'; payload: ShowImagePayload; description: string }
  | { type: 'searchResults'; payload: ShowSearchResultsPayload; description: string };

// 使用联合类型定义不同类型的 Studio 动作
export type StudioAction =
  | CommonAction
  | { type: 'openFolder'; payload: { folderPath: string }; description: string }
  | { type: 'openFile'; payload: { filePath: string }; description: string }
  | { type: 'openUrl'; payload: { url: string }; description: string }
  | {
      description: string;
      type: 'executeBrowserAction';
      payload: {
        browserAction: {
          selector: string;
          action: 'click' | 'type' | 'scroll' | 'hover';
          value?: string;
        };
      };
    }
  | {
      description: string;
      type: 'collect';
      payload: {
        type: 'file' | 'image' | 'text';
        content: string;
        path: string;
        metadata: CollectItemMetadata;
      };
    };

export type StudioActionForRenderer =
  | CommonAction
  | {
      type: 'openFolder';
      payload: Array<{ name: string; type: 'file' | 'folder'; path: string }>;
      description: string;
    };
