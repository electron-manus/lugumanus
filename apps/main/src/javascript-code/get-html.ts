function getHtml() {
  return document.documentElement.outerHTML;
}

export const getHtmlCode = `(${getHtml.toString()})()`;
