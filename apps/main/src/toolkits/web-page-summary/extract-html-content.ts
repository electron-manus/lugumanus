import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';

export function extractHtmlContent(html: string) {
  const $ = cheerio.load(html);
  let rscContent = '';

  // 处理Next.js的RSC数据
  rscContent += extractNextJsRscData(html, $);

  // 原有内容提取逻辑
  $(
    'nav, header, footer, aside, .ads, .advertisement, .banner, .menu, .sidebar, .comments, .related',
  ).remove();

  $('script, style, iframe, img, video, svg').remove();

  $(
    '[id*="nav"], [id*="header"], [id*="footer"], [id*="sidebar"], [id*="menu"], [id*="ad"]',
  ).remove();
  $(
    '[class*="nav"], [class*="header"], [class*="footer"], [class*="sidebar"], [class*="menu"], [class*="ad"]',
  ).remove();

  // // 移除HTML注释 (可能包含隐藏的script代码)
  $('*')
    .contents()
    .each(function () {
      if (this.type === 'comment') {
        $(this).remove();
      }
    });

  // 尝试找到主要内容区域
  let mainContent = $(
    'main, article, .content, .article, .post, #content, #main, #article, [role="main"]',
  );

  // 如果没有找到明确的内容区域，尝试用启发式方法
  if (mainContent.length === 0) {
    // 查找最可能包含主要内容的div（具有较多文本的div）
    const potentialContentDivs = $('div').filter(function () {
      // 首先克隆节点，然后移除所有script和style标签
      const $clone = $(this).clone();
      $clone.find('script, style').remove();

      const text = $clone.text().trim();
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
    return rscContent + extractFormattedText(mainContent, $);
  }

  // 如果没找到明确的内容区，则返回body内容但清理更多元素
  $('br').replaceWith('\n');
  // 移除空白节点;
  $('*').each(function () {
    const $this = $(this);
    if ($this.text().trim() === '' && $this.children().length === 0) {
      $this.remove();
    }
  });

  return rscContent + extractFormattedText($('body'), $);
}

// 专门处理Next.js的RSC数据
function extractNextJsRscData(html: string, $: cheerio.CheerioAPI): string {
  let content = '';

  // 1. 处理Next.js数据脚本 (__NEXT_DATA__)
  const nextDataScript = $('#__NEXT_DATA__');
  if (nextDataScript.length > 0) {
    try {
      const nextData = JSON.parse(nextDataScript.html() || '{}');
      if (nextData.props?.pageProps) {
        content += extractTextFromObject(nextData.props.pageProps, $);
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  // 2. 提取self.__next_f.push()中的数据 (Next.js RSC特有格式)
  const nextFPushRegex = /self\.__next_f\.push\(\[1,\s*"([^"]+)"\]\)/g;
  let match = nextFPushRegex.exec(html);
  let combinedData = '';

  while (match !== null) {
    combinedData += match[1];
    match = nextFPushRegex.exec(html);
  }

  // 替换转义字符
  combinedData = combinedData
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>');

  // 提取已知的内容模式
  const contentPatterns = [
    /"content":"([^"]+)"/g,
    /"text":"([^"]+)"/g,
    /"children":"([^"]+)"/g,
    /"title":"([^"]+)"/g,
    /"description":"([^"]+)"/g,
    /"__html":"([^"]+)"/g,
  ];

  for (const pattern of contentPatterns) {
    let contentMatch = pattern.exec(combinedData);
    while (contentMatch !== null) {
      // 解析HTML实体并移除HTML标签
      const extractedText = contentMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/<[^>]*>/g, '');

      if (extractedText.length > 20) {
        // 过滤短内容
        content += `\n${extractedText}`;
      }
      contentMatch = pattern.exec(combinedData);
    }
  }

  // 3. 处理模板标签中的内容
  $('template').each(function () {
    const dataAttr = $(this).attr('data-dgst');
    if (dataAttr?.includes('BAILOUT_TO_CLIENT_SIDE_RENDERING')) {
      // 查找相关的数据源
      const id = $(this).attr('id') || '';
      const nearbyScripts = $(`script[data-for="${id}"]`);

      if (nearbyScripts.length > 0) {
        try {
          const scriptContent = nearbyScripts.html() || '';
          // 处理脚本内容...
          if (scriptContent.includes('"content"') || scriptContent.includes('"text"')) {
            content += extractTextFromScriptContent(scriptContent, $);
          }
        } catch (e) {
          // 忽略错误
        }
      }
    }
  });

  // 4. 解析HTML内容中的数据属性
  $('[data-content], [data-text]').each(function () {
    const dataContent = $(this).attr('data-content') || $(this).attr('data-text');
    if (dataContent && dataContent.length > 20) {
      content += `\n${dataContent}`;
    }
  });

  return content;
}

// 从script内容中提取文本
function extractTextFromScriptContent(scriptContent: string, $: cheerio.CheerioAPI): string {
  let text = '';

  // 尝试寻找JSON对象
  const jsonMatches = scriptContent.match(/\{[^{]*"(content|text|children|value)":[^}]*\}/g);
  if (jsonMatches) {
    for (const jsonStr of jsonMatches) {
      try {
        // 修复不完整的JSON
        const fixedJson = jsonStr.replace(/'/g, '"').replace(/([{,]\s*)(\w+):/g, '$1"$2":');
        const obj = JSON.parse(fixedJson);
        text += extractTextFromObject(obj, $);
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  // 尝试直接提取引号中的内容
  const textMatches = scriptContent.match(/"(content|text|children|value)":"([^"]+)"/g);
  if (textMatches) {
    for (const match of textMatches) {
      const parts = match.split(':"');
      if (parts.length > 1) {
        const content = parts[1].replace(/"\s*$/, '');
        if (content.length > 20 && !content.startsWith('http')) {
          text += `\n${content}`;
        }
      }
    }
  }

  return text;
}

// 从对象中递归提取文本内容
function extractTextFromObject(obj: Record<string, string>, $: cheerio.CheerioAPI): string {
  if (!obj || typeof obj !== 'object') {
    return '';
  }

  let text = '';

  // 文本内容常见的键名
  const contentKeys = [
    'title',
    'description',
    'content',
    'text',
    'body',
    'articleBody',
    'headline',
    'subtitle',
    'paragraph',
    'plaintext',
    'summary',
    'children',
    'value',
    'label',
    'name',
    '__html',
  ];

  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // 如果键名是内容相关或值较长，可能是有价值的文本
      if (contentKeys.includes(key) || (obj[key].length > 80 && !key.includes('url'))) {
        // 如果内容是HTML，尝试提取纯文本
        let value = obj[key];
        if (value.includes('<') && value.includes('>')) {
          const tempDiv = $('<div></div>').html(value);
          value = tempDiv.text();
        }
        text += `\n${value}`;
      }
    } else if (Array.isArray(obj[key])) {
      // 处理数组
      for (const item of obj[key] as string[]) {
        if (typeof item === 'string' && item.length > 30) {
          text += `\n${item}`;
        } else if (typeof item === 'object' && item !== null) {
          text += extractTextFromObject(item, $);
        }
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // 递归处理嵌套对象
      text += extractTextFromObject(obj[key], $);
    }
  }

  return text;
}

// 提取格式化文本的辅助函数
function extractFormattedText(element: cheerio.Cheerio<Element>, $: cheerio.CheerioAPI): string {
  let result = '';

  // 处理特定元素，确保选择器格式正确
  element.find('*').each(function () {
    const text = $(this).text().trim();
    if (text) {
      // 根据元素类型添加适当的格式
      const tagName = this.tagName.toLowerCase();
      if (tagName.match(/^h[1-6]$/)) {
        // 标题元素
        result += `\n\n${text}\n\n`;
      } else if (tagName === 'li') {
        // 列表项
        result += `\n• ${text}`;
      } else if (tagName === 'blockquote') {
        // 引用
        result += `\n\n${text}\n\n`;
      } else if (['span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'code'].includes(tagName)) {
        // 链接
        result += ` ${text} `;
      } else {
        // 其他元素
        result += `\n\n${text}`;
      }
    }
  });

  // 清理多余的空行
  return result.replace(/\n{3,}/g, '\n\n').trim();
}
