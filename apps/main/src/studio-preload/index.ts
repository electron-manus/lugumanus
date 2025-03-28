import { setupBrowserOperations } from './operations/browser-operations';
import { setupDOMOperations } from './operations/dom-operations';
import { setupInputOperations } from './operations/input-operations';
import { setupMouseOperations } from './operations/mouse-operations';
import { setupUIOperations } from './operations/ui-operations';
import { setupUtilityOperations } from './operations/utility-operations';

require('electron').contextBridge.exposeInMainWorld('Main', {
  ...setupDOMOperations(),
  ...setupInputOperations(),
  ...setupUIOperations(),
  ...setupMouseOperations(),
  ...setupBrowserOperations(),
  ...setupUtilityOperations(),
});
