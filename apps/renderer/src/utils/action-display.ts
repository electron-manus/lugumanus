import {
  faBoxArchive,
  faFile,
  faFolder,
  faImage,
  faLink,
  faMarker,
  faMousePointer,
  faPerson,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import type { StudioActionType } from '@lugu-manus/share';

export function getActionIcon(action?: StudioActionType) {
  switch (action) {
    case 'openFolder':
      return faFolder;
    case 'openFile':
      return faFile;
    case 'openUrl':
      return faLink;
    case 'executeBrowserAction':
      return faMousePointer;
    case 'editor':
      return faMarker;
    case 'image':
      return faImage;
    case 'searchResults':
      return faSearch;
    case 'collect':
      return faBoxArchive;
    default:
      return faPerson;
  }
}

export function getActionName(action?: StudioActionType) {
  switch (action) {
    case 'openFolder':
      return '打开文件夹';
    case 'openFile':
      return '打开文件';
    case 'openUrl':
      return '打开链接';
    case 'executeBrowserAction':
      return '执行浏览器操作';
    case 'editor':
      return '编辑';
    case 'image':
      return '图片';
    case 'searchResults':
      return '搜索';
    case 'collect':
      return '收集';
    default:
      return '';
  }
}
