import { BaiduSearchAgent } from './baidu-search-agent.js';
import { BingSearchAgent } from './bing-search-agent.js';
import { SoSearchAgent } from './so-search-agent.js';
import { SouGouSearchAgent } from './sougou-search-agent.js';

export const searchToolkits = [
  new BaiduSearchAgent(),
  new SoSearchAgent(),
  new SouGouSearchAgent(),
  new BingSearchAgent(),
];
