import type { BasicAcceptedElems, Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';

const name = 'So';
const host = 'www.so.com';

export const SoSearchConfig = {
  name,
  host,
  description: `${name} search tool`,
  url: `https://${host}/web`,
  referrer: `https://${host}/`,
  params: (query: string, page: number) => ({
    query: query,
    page: page + 1,
  }),
  selector: '.vrwrap, .rb',
  titleSelector: 'h3',
  linkSelector: 'a',
  snippetSelector: (element: BasicAcceptedElems<AnyNode>, $: CheerioAPI) => {
    return $(element).find('.str_info').text() || $(element).find('.ft').text();
  },
  pageCount: 2,
  delay: true,
};
