import type { PreviewListItem } from '@lugu-manus/share';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import * as yaml from 'js-yaml';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent, SpecializedToolAgentConstructor } from '../types.js';
import { commonHeader } from './common-header.js';

// 搜索引擎配置接口
interface SearchEngineConfig {
  name: string;
  description: string;
  url: string;
  host: string;
  referrer: string;
  params: (query: string, page: number) => Record<string, string | number>;
  selector: string;
  titleSelector: string;
  linkSelector: string;
  snippetSelector:
    | string
    | ((element: cheerio.BasicAcceptedElems<AnyNode>, $: cheerio.CheerioAPI) => string);
  pageCount?: number;
  delay?: boolean;
}

// 创建搜索代理的工厂函数
export function createSearchAgent(config: SearchEngineConfig): SpecializedToolAgentConstructor {
  return class SearchAgent extends BaseAgent implements SpecializedToolAgent {
    override name = `${config.name}SearchTool`;
    description = config.description;
    parameters = {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords' },
      },
      required: ['query'],
    };
    strict = true;

    async execute(query: Record<string, string>, taskRef: AgentTaskRef): Promise<unknown> {
      const results: PreviewListItem[] = [];
      let cookies = '';

      for (let page = 0; page < (config.pageCount || 2); page++) {
        if (config.delay && page > 0) {
          const delay = 1000 + Math.floor(Math.random() * 2000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const response = await axios.get(config.url, {
          params: config.params(query.query, page),
          responseType: 'text',
          headers: {
            ...commonHeader,
            Host: config.host,
            Referer: config.referrer,
            Cookie: cookies,
          },
        });

        const setCookieHeader = response.headers['set-cookie'] as unknown as string;
        if (setCookieHeader) {
          if (Array.isArray(setCookieHeader)) {
            cookies = setCookieHeader.map((cookie) => cookie.split(';')[0]).join('; ');
          } else {
            cookies = setCookieHeader.split(';')[0];
          }
        }

        const $ = cheerio.load(response.data);
        $(config.selector).each((index, element) => {
          const title = $(element).find(config.titleSelector).text();
          const link = $(element).find(config.linkSelector).attr('href');

          let snippet: string;
          if (typeof config.snippetSelector === 'function') {
            snippet = config.snippetSelector(element, $);
          } else {
            snippet = $(element).find(config.snippetSelector).text();
          }

          if (!title || !link || !snippet) {
            return;
          }
          results.push({ title, url: link, description: snippet });
        });
      }

      await taskRef.studio.start(
        {
          type: 'searchResults',
          description: query.query,
          payload: {
            query: query.query,
            searchResults: results,
          },
        },
        taskRef.observer,
        taskRef.abortSignal,
      );

      return yaml.dump(results);
    }
  } as unknown as SpecializedToolAgentConstructor;
}
