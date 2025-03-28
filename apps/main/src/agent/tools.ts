import { browserUseToolkits } from '../toolkits/browser-user-toolkit';
import { chartToolkits } from '../toolkits/chart-toolkit';
import codeToolkit from '../toolkits/code-toolkit';
import { documentToolkits } from '../toolkits/document-toolkit';
import { fileToolkits } from '../toolkits/file-toolkit';
import { searchToolkits } from '../toolkits/search-toolkit';
import { webPageSummaryToolkits } from '../toolkits/web-page-summary';

export const tools = [
  ...searchToolkits,
  ...webPageSummaryToolkits,
  ...chartToolkits,
  ...documentToolkits,
  ...fileToolkits,
  ...browserUseToolkits,
  ...codeToolkit,
];
