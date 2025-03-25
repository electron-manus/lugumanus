import { BaiduSearchAgent } from './BaiduSearchAgent.js';
import { BingSearchAgent } from './BingSearchAgent.js';
import { SoSearchAgent } from './SoSearchAgent.js';
import { SouGouSearchAgent } from './SouGouSearchAgent.js';

export const searchToolkit = [
  new BaiduSearchAgent(),
  new SoSearchAgent(),
  new SouGouSearchAgent(),
  new BingSearchAgent(),
];
