import { BaiduSearchConfig } from './baidu-search-agent.js';
import { createSearchAgent } from './search-agent-factory.js';
// import { BingSearchConfig } from './bing-search-agent.js';
// import { SoSearchConfig } from './so-search-agent.js';
// import { SouGouSearchConfig } from './sougou-search-agent.js';

// 创建搜索代理工厂
const BaiduSearchAgentClass = createSearchAgent(BaiduSearchConfig);
// const SoSearchAgentClass = createSearchAgent(SoSearchConfig);
// const SouGouSearchAgentClass = createSearchAgent(SouGouSearchConfig);
// const BingSearchAgentClass = createSearchAgent(BingSearchConfig);

export const searchToolkits = [
  new BaiduSearchAgentClass(),
  // new SoSearchAgentClass(),
  // new SouGouSearchAgentClass(),
  // new BingSearchAgentClass(),
];
