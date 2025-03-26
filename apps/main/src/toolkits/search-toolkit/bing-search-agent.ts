export const BingSearchConfig = {
  name: 'Bing',
  description: 'Bing search tool',
  url: 'https://www.bing.com/search',
  host: 'www.bing.com',
  referrer: 'https://www.bing.com/',
  params: (query: string, page: number) => ({
    q: query,
    first: page * 10 + 1,
  }),
  selector: '.b_algo',
  titleSelector: 'h2',
  linkSelector: 'a',
  snippetSelector: '.b_caption p',
  pageCount: 2,
  delay: false,
};
