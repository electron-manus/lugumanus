import * as cheerio from 'cheerio';

export function extractHtmlContent(html: string) {
  const $ = cheerio.load(html);

  // 移除常见的非内容元素
  $(
    'nav, header, footer, aside, .ads, .advertisement, .banner, .menu, .sidebar, .comments, .related, script, style, iframe',
  ).remove();

  $(
    '[id*="nav"], [id*="header"], [id*="footer"], [id*="sidebar"], [id*="menu"], [id*="ad"]',
  ).remove();
  $(
    '[class*="nav"], [class*="header"], [class*="footer"], [class*="sidebar"], [class*="menu"], [class*="ad"]',
  ).remove();

  // 尝试找到主要内容区域
  let mainContent = $(
    'main, article, .content, .article, .post, #content, #main, #article, [role="main"]',
  );

  // 如果没有找到明确的内容区域，尝试用启发式方法
  if (mainContent.length === 0) {
    // 查找最可能包含主要内容的div（具有较多文本的div）
    const potentialContentDivs = $('div').filter(function () {
      const text = $(this).text().trim();
      const textLength = text.length;
      const links = $(this).find('a').length;

      // 长文本且链接不太多的div可能是内容区
      return textLength > 200 && links < textLength / 50;
    });

    // 选择文本最长的div作为主内容
    let maxTextLength = 0;
    potentialContentDivs.each(function () {
      const textLength = $(this).text().trim().length;
      if (textLength > maxTextLength) {
        maxTextLength = textLength;
        mainContent = $(this);
      }
    });
  }

  // 如果找到了主内容区域，只返回这部分
  if (mainContent.length > 0) {
    return mainContent.html() || '';
  }

  // 如果没找到明确的内容区，则返回body内容但清理更多元素
  $('br').replaceWith('\n');
  // 移除空白节点
  $('*').each(function () {
    const $this = $(this);
    if ($this.text().trim() === '' && $this.children().length === 0) {
      $this.remove();
    }
  });

  return $('body').html() || '';
}
