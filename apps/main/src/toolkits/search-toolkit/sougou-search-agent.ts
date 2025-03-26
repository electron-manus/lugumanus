const name = 'SouGou';
const host = 'www.sogou.com';

export const SouGouSearchConfig = {
  name,
  host,
  description: `${name} search tool`,
  url: `https://${host}/s`,
  referrer: `https://${host}/`,
  params: (query: string, page: number) => ({
    q: query,
    pn: page * 10,
  }),
  selector: '.result',
  titleSelector: 'h3',
  linkSelector: 'a',
  snippetSelector: '.res-desc',
  pageCount: 2,
  delay: true,
};
