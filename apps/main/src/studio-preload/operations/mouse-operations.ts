declare global {
  interface Window {
    lastMousePosition: { x: number; y: number };
  }
}

export function setupMouseOperations() {
  return {
    mouseMoveTo(x: number, y: number) {
      const _win = window;
      // 记录上一次鼠标位置的变量（如果不存在则创建）
      if (!_win.lastMousePosition) {
        _win.lastMousePosition = { x: 0, y: 0 };
      }

      // 检查模拟鼠标元素是否存在
      let cursor = document.getElementById('simulated-cursor');

      // 如果不存在，则创建一个
      if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'simulated-cursor';

        // 设置鼠标样式为斜三角形
        const style = cursor.style;
        style.position = 'fixed';
        style.width = '0';
        style.height = '0';

        style.borderLeft = '12px solid transparent';
        style.borderRight = '12px solid transparent';
        style.borderBottom = '24px solid #259F71';
        style.pointerEvents = 'none';

        style.transform = 'rotate(90deg)';
        style.zIndex = '2147483648';
        style.pointerEvents = 'none'; // 确保鼠标不会干扰页面交互

        // 设置初始位置
        style.left = `${_win.lastMousePosition.x}px`;
        style.top = `${_win.lastMousePosition.y}px`;

        document.body.appendChild(cursor);
      }

      // 动画持续时间（毫秒）
      const duration = 500;
      const startTime = performance.now();
      const startX = _win.lastMousePosition.x;
      const startY = _win.lastMousePosition.y;
      const distanceX = Number(x) - startX;
      const distanceY = Number(y) - startY;

      // 使用 requestAnimationFrame 创建平滑动画
      function animate(currentTime: number) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        // 使用缓动函数使动画更自然
        const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

        const currentX = startX + distanceX * easeProgress;
        const currentY = startY + distanceY * easeProgress;

        if (cursor) {
          cursor.style.left = `${currentX}px`;
          cursor.style.top = `${currentY}px`;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // 动画完成后更新最后位置
          _win.lastMousePosition.x = Number(x);
          _win.lastMousePosition.y = Number(y);
        }
      }

      requestAnimationFrame(animate);

      // 返回一个 Promise，在动画完成后解析
      return new Promise((resolve) => setTimeout(resolve, duration));
    },

    mouseMoveThenClick(x: number, y: number) {
      return this.mouseMoveTo(x, y).then(() => {
        // 创建点击动画效果
        const clickEffect = document.createElement('div');
        clickEffect.style.position = 'fixed';
        clickEffect.style.left = `${x - 15}px`;
        clickEffect.style.top = `${y - 15}px`;
        clickEffect.style.width = '30px';
        clickEffect.style.height = '30px';
        clickEffect.style.borderRadius = '50%';
        clickEffect.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        clickEffect.style.zIndex = '2147483648';
        clickEffect.style.pointerEvents = 'none';
        clickEffect.style.transition = 'transform 0.3s, opacity 0.3s';
        clickEffect.style.transform = 'scale(0.5)';
        clickEffect.style.opacity = '1';

        document.body.appendChild(clickEffect);

        // 动画效果
        setTimeout(() => {
          clickEffect.style.transform = 'scale(1.5)';
          clickEffect.style.opacity = '0';

          // 动画结束后移除元素
          setTimeout(() => {
            document.body.removeChild(clickEffect);
          }, 300);
        }, 10);

        return new Promise((resolve) => setTimeout(resolve, 350));
      });
    },

    mouseMoveAndClickTo(x: number, y: number) {
      return this.mouseMoveThenClick(x, y);
    },
  };
}
