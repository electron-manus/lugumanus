export function setupUIOperations() {
  return {
    // 在页面上显示一个通知
    showNotification(message: string) {
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      notification.style.color = 'white';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '4px';
      notification.style.zIndex = '2147483648';
      notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';

      document.body.appendChild(notification);

      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    },

    // 在页面上显示一个操作，并返回一个 Promise
    // 第一个参数是提示信息，后面的参数是操作按钮
    // 例如：showOperation("是否继续？", "继续", "取消")
    // 点击按钮后，返回按钮的文本
    // 必须要点击执行，不能取消
    // 页面跳转会默认认为是点击继续
    showOperation(message: string, ...operations: string[]) {
      return new Promise<string>((resolve) => {
        // 创建操作容器
        const operationContainer = document.createElement('div');
        operationContainer.style.position = 'fixed';
        operationContainer.style.bottom = '20px';
        operationContainer.style.left = '50%';
        operationContainer.style.transform = 'translateX(-50%)';
        operationContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        operationContainer.style.color = 'white';
        operationContainer.style.padding = '15px 20px';
        operationContainer.style.borderRadius = '8px';
        operationContainer.style.zIndex = '2147483648';
        operationContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        operationContainer.style.display = 'flex';
        operationContainer.style.flexDirection = 'column';
        operationContainer.style.alignItems = 'center';
        operationContainer.style.gap = '10px';

        // 添加提示文本
        const promptText = document.createElement('div');
        promptText.textContent = message;
        promptText.style.marginBottom = '10px';
        promptText.style.fontSize = '16px';
        operationContainer.appendChild(promptText);

        // 创建按钮容器
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '10px';
        buttonsContainer.style.justifyContent = 'center';
        buttonsContainer.style.flexWrap = 'wrap';

        // 为每个操作创建按钮
        for (const operation of operations) {
          const button = document.createElement('button');
          button.textContent = operation;
          button.style.padding = '8px 16px';
          button.style.borderRadius = '4px';
          button.style.border = 'none';
          button.style.backgroundColor = '#4285f4';
          button.style.color = 'white';
          button.style.cursor = 'pointer';
          button.style.fontWeight = 'bold';
          button.style.transition = 'background-color 0.2s';

          // 鼠标悬停效果
          button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#3367d6';
          });

          button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#4285f4';
          });

          // 点击事件
          button.addEventListener('click', () => {
            document.body.removeChild(operationContainer);
            resolve(operation);
          });

          buttonsContainer.appendChild(button);
        }

        operationContainer.appendChild(buttonsContainer);
        document.body.appendChild(operationContainer);
      });
    },
  };
}
