import type { BasicAcceptedElems, Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';

const name = 'Baidu';
const host = 'www.baidu.com';

export const BaiduSearchConfig = {
  name,
  description: `${name} search tool`,
  url: `https://${host}/s`,
  host,
  referrer: `https://${host}/`,
  params: (query: string, page: number) => ({
    wd: query,
    pn: page * 10,
    ie: 'utf-8',
    rn: 10,
  }),
  selector: '.result, .result-op',
  titleSelector: 'h3',
  linkSelector: 'a',
  snippetSelector: (element: BasicAcceptedElems<AnyNode>, $: CheerioAPI) => {
    const cAbstract = $(element).find('.c-abstract');
    const cSpanLastCColorText = $(element).find('.c-span-last .c-color-text');
    const contentRight = $(element).find('[class^="content-right"]');
    const rightLink = $(element).find('[class^="right-link"]');

    let snippetNode: Cheerio<AnyNode>;
    if (cAbstract.length) {
      snippetNode = cAbstract;
    } else if (cSpanLastCColorText.length) {
      snippetNode = cSpanLastCColorText;
    } else if (contentRight.length) {
      snippetNode = contentRight;
    } else if (rightLink.length) {
      snippetNode = rightLink;
    } else {
      snippetNode = $('');
    }

    return snippetNode.text();
  },
  pageCount: 2,
  delay: true,
};
