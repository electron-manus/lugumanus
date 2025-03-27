import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { WebContentsView } from 'electron';
import { ElectronInputSimulator } from './electron-input-simulator';

// 模拟 WebContentsView
const mockWebContentsView = {
  webContents: {
    focus: mock(() => {}),
    sendInputEvent: mock(() => {}),
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    executeJavaScript: mock(async (): Promise<any> => {}),
  },
};

describe('Electron 输入模拟器', () => {
  let simulator: ElectronInputSimulator;
  let timeoutSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // 重置所有模拟函数
    mock.restore();

    // 创建模拟器实例
    simulator = new ElectronInputSimulator(mockWebContentsView as unknown as WebContentsView);

    // 模拟 sleep 函数以加速测试
    timeoutSpy = spyOn(global, 'setTimeout').mockImplementation(((
      cb: (...args: unknown[]) => void,
    ): number => {
      cb();
      return 0;
    }) as typeof setTimeout);
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
  });

  describe('模拟鼠标点击', () => {
    test('应该发送正确的鼠标事件序列', async () => {
      // 模拟 sendCommandToWebContents 方法
      const sendCommandSpy = spyOn(simulator, 'sendCommandToWebContents').mockResolvedValue(
        undefined,
      );
      const sendEventSpy = spyOn(simulator, 'sendEventToWebContents').mockResolvedValue(undefined);

      await simulator.simulateMouseClickSequence({ x: 100, y: 200 });

      // 验证鼠标动画命令被调用
      expect(sendCommandSpy).toHaveBeenCalledWith('Main.mouseAnimationCommand', '100', '200');

      // 验证鼠标事件序列
      expect(sendEventSpy).toHaveBeenCalledTimes(4);
      expect(sendEventSpy).toHaveBeenNthCalledWith(1, {
        type: 'mouseEnter',
        x: 100,
        y: 200,
        button: 'left',
      });
      expect(sendEventSpy).toHaveBeenNthCalledWith(2, {
        type: 'mouseDown',
        x: 100,
        y: 200,
        button: 'left',
        clickCount: 1,
      });
      expect(sendEventSpy).toHaveBeenNthCalledWith(3, {
        type: 'mouseUp',
        x: 100,
        y: 200,
        button: 'left',
      });
      expect(sendEventSpy).toHaveBeenNthCalledWith(4, {
        type: 'mouseLeave',
        x: 100,
        y: 200,
        button: 'left',
      });
    });

    test('应该在坐标无效时抛出错误', async () => {
      await expect(simulator.simulateMouseClickSequence({ x: 0, y: 0 })).rejects.toThrow(
        'Invalid click coordinates',
      );
    });
  });

  describe('模拟键盘输入', () => {
    test('应该正确处理普通文本输入', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const sendKeySpy = spyOn(simulator as any, 'sendKeySequence').mockResolvedValue(undefined);

      await simulator.simulateKeyboardInput('test');

      // 验证每个字符都被处理
      expect(sendKeySpy).toHaveBeenCalledTimes(4);
      expect(sendKeySpy).toHaveBeenNthCalledWith(1, 't', undefined);
      expect(sendKeySpy).toHaveBeenNthCalledWith(2, 'e', undefined);
      expect(sendKeySpy).toHaveBeenNthCalledWith(3, 's', undefined);
      expect(sendKeySpy).toHaveBeenNthCalledWith(4, 't', undefined);
    });

    test('应该正确处理大写字母', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const sendKeySpy = spyOn(simulator as any, 'sendKeySequence').mockResolvedValue(undefined);

      await simulator.simulateKeyboardInput('Test');

      // 验证大写字母使用了shift修饰符
      expect(sendKeySpy).toHaveBeenNthCalledWith(1, 'T', ['shift']);
      expect(sendKeySpy).toHaveBeenNthCalledWith(2, 'e', undefined);
      expect(sendKeySpy).toHaveBeenNthCalledWith(3, 's', undefined);
      expect(sendKeySpy).toHaveBeenNthCalledWith(4, 't', undefined);
    });

    test('应该调用中文输入方法处理中文文本', async () => {
      const chineseSpy = spyOn(simulator, 'simulateChineseInput').mockResolvedValue(undefined);

      await simulator.simulateKeyboardInput('测试');

      expect(chineseSpy).toHaveBeenCalledWith('测试');
    });
  });

  describe('模拟中文输入', () => {
    test('应该正确处理中文输入', async () => {
      // 模拟依赖方法
      const keyboardSpy = spyOn(simulator, 'simulateKeyboardInput').mockResolvedValue(undefined);
      const commandSpy = spyOn(simulator, 'sendCommandToWebContents').mockResolvedValue(undefined);
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const sendKeySpy = spyOn(simulator as any, 'sendKeySequence').mockResolvedValue(undefined);

      await simulator.simulateChineseInput('你好');

      // 验证拼音输入和文本设置
      expect(keyboardSpy).toHaveBeenCalled();
      expect(commandSpy).toHaveBeenCalledWith('Main.getActiveElementObjectIdCommand');
      expect(commandSpy).toHaveBeenCalledWith('Main.setEditableValueCommand', '你好', undefined);
      expect(sendKeySpy).toHaveBeenCalledWith('Enter');
    });
  });

  describe('在坐标位置设置值', () => {
    test('应该正确设置输入值', async () => {
      // 模拟依赖方法
      const clickSpy = spyOn(simulator, 'simulateMouseClickSequence').mockResolvedValue(undefined);
      const commandSpy = spyOn(simulator, 'sendCommandToWebContents');

      // 模拟返回值
      commandSpy.mockResolvedValueOnce('obj1'); // getActiveElementObjectIdCommand
      commandSpy.mockResolvedValueOnce(true); // isEditableElementCommand

      const keyboardSpy = spyOn(simulator, 'simulateKeyboardInput').mockResolvedValue(undefined);

      await simulator.setValueAtCoordinates({ x: 100, y: 200 }, 'test value');

      // 验证点击和输入
      expect(clickSpy).toHaveBeenCalledWith({ x: 100, y: 200 }, 3);
      expect(commandSpy).toHaveBeenCalledWith('Main.getActiveElementObjectIdCommand');
      expect(commandSpy).toHaveBeenCalledWith('Main.isEditableElementCommand', 'obj1');
      expect(keyboardSpy).toHaveBeenCalledWith('test value');
      expect(commandSpy).toHaveBeenCalledWith('Main.elementBlurCommand');
    });

    test('应该在元素不可编辑时抛出错误', async () => {
      // 模拟依赖方法
      spyOn(simulator, 'simulateMouseClickSequence').mockResolvedValue(undefined);
      const commandSpy = spyOn(simulator, 'sendCommandToWebContents');

      // 模拟返回值
      commandSpy.mockResolvedValueOnce('obj1'); // getActiveElementObjectIdCommand
      commandSpy.mockResolvedValueOnce(false); // isEditableElementCommand - 不可编辑

      expect(simulator.setValueAtCoordinates({ x: 100, y: 200 }, 'test value')).rejects.toThrow(
        'Failed to get focus element, maximum retry count reached',
      );
    });
  });

  describe('获取元素中心点', () => {
    test('应该正确计算元素中心点', async () => {
      const commandSpy = spyOn(simulator, 'sendCommandToWebContents').mockResolvedValue({
        left: 100,
        top: 200,
        width: 300,
        height: 400,
      });

      const center = await simulator.getElementCenter('obj1');

      expect(commandSpy).toHaveBeenCalledWith('Main.getBoundingClientRectCommand', 'obj1');
      expect(center).toEqual({ x: 250, y: 400 });
    });

    test('应该在获取位置失败时抛出错误', async () => {
      spyOn(simulator, 'sendCommandToWebContents').mockResolvedValue(null);

      expect(simulator.getElementCenter('obj1')).rejects.toThrow(
        'Failed to get element position information',
      );
    });
  });

  describe('向下滚动/向上滚动', () => {
    test('应该正确发送滚动事件', async () => {
      // 模拟窗口高度
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      spyOn(simulator as any, 'getWindowHeight').mockResolvedValue(900);
      const sendEventSpy = spyOn(simulator, 'sendEventToWebContents').mockResolvedValue(undefined);

      await simulator.scrollDown();

      expect(sendEventSpy).toHaveBeenCalledWith({
        type: 'mouseWheel',
        x: 100,
        y: 100,
        deltaX: 0,
        deltaY: -600, // (900 - 900/3)
        canScroll: true,
      });

      await simulator.scrollUp();

      expect(sendEventSpy).toHaveBeenCalledWith({
        type: 'mouseWheel',
        x: 100,
        y: 100,
        deltaX: 0,
        deltaY: 300, // 900/3
        canScroll: true,
      });
    });
  });

  describe('向WebContents发送事件', () => {
    test('应该正确发送事件到WebContents', async () => {
      await simulator.sendEventToWebContents({ type: 'keyDown', keyCode: 'a' });

      expect(mockWebContentsView.webContents.focus).toHaveBeenCalled();
      expect(mockWebContentsView.webContents.sendInputEvent).toHaveBeenCalledWith({
        type: 'keyDown',
        keyCode: 'a',
      });
    });
  });

  describe('向WebContents发送命令', () => {
    test('应该正确执行JavaScript命令', async () => {
      mockWebContentsView.webContents.executeJavaScript.mockResolvedValue('result');

      const result = await simulator.sendCommandToWebContents('Main.testCommand', 'param1', 123);

      expect(mockWebContentsView.webContents.executeJavaScript).toHaveBeenCalledWith(
        'window.Main.testCommand("param1",123)',
      );
      expect(result).toBe('result');
    });

    test('应该在命令无效时抛出错误', async () => {
      expect(simulator.sendCommandToWebContents('invalid command', 'param1')).rejects.toThrow(
        'Invalid command name: invalid command',
      );
    });
  });
});
