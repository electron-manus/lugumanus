function getRect() {
  const rect = document.getElementById('studio')?.getBoundingClientRect();
  return {
    x: rect?.x,
    y: rect?.y,
    width: rect?.width,
    height: rect?.height,
  };
}

export const getRectJavascript = `(${getRect.toString()})()`;
