import type {
  InputEvent,
  KeyboardInputEvent,
  MouseInputEvent,
  MouseWheelInputEvent,
  WebContentsView,
} from 'electron';
import { cut } from 'jieba-wasm';
// @ts-ignore
import { toKeyEvent } from 'keyboardevent-from-electron-accelerator';
import pinyin from 'pinyin';
import { random, sleep } from 'radash';

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const _pinyin = typeof pinyin === 'function' ? pinyin : (pinyin as any).default;

// 为坐标点定义接口
interface PointCoordinates {
  x: number;
  y: number;
}

// 定义事件类型
type InputEventType = MouseInputEvent | MouseWheelInputEvent | KeyboardInputEvent;

/**
 * 浏览器命令映射接口
 * 包含与浏览器内容进行交互的所有命令
 */
interface BrowserCommandMap {
  // 模拟鼠标动画的钩子
  mouseAnimationCommand: string;
  // 设置元素的值
  setEditableValueCommand: string;
  // 移除元素的焦点
  elementBlurCommand: string;
  // 获取元素的ID
  getActiveElementObjectIdCommand: string;
  // 判断元素是否是输入框
  isEditableElementCommand: string;
  // 获取元素的边界矩形
  getBoundingClientRectCommand: string;
  // 获取窗口的高度
  getWindowHeightCommand: string;
  // 获取网页的HTML
  getAnnotatedHTML: string;
  // 显示操作提示
  showOperation: string;
  // 将元素ID转换为DOM对象ID
  elementIdConvertObjectIdCommand: string;
}

// 定义结果类型
interface BoundingClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class ElectronInputSimulator {
  static readonly INPUT_DELAYS = {
    MOUSE: {
      CLICK: 100,
      AFTER_CLICK: 1000,
    },
    KEYBOARD: {
      KEY_PRESS: 20,
      BETWEEN_CHARS: { MIN: 40, MAX: 60 },
      AFTER_TYPING: 200,
      ENTER_KEY: 100,
    },
    CHINESE: {
      CHAR: 100,
      AFTER_INPUT: 500,
    },
  };

  static readonly DEFAULT_BROWSER_COMMANDS: BrowserCommandMap = {
    mouseAnimationCommand: 'Main.mouseAnimationCommand',
    setEditableValueCommand: 'Main.setEditableValueCommand',
    elementBlurCommand: 'Main.elementBlurCommand',
    getActiveElementObjectIdCommand: 'Main.getActiveElementObjectIdCommand',
    isEditableElementCommand: 'Main.isEditableElementCommand',
    getBoundingClientRectCommand: 'Main.getBoundingClientRectCommand',
    getWindowHeightCommand: 'Main.getWindowHeightCommand',
    getAnnotatedHTML: 'Main.getAnnotatedHTML',
    showOperation: 'Main.showOperation',
    elementIdConvertObjectIdCommand: 'Main.elementIdConvertObjectIdCommand',
  };

  private readonly commands: BrowserCommandMap;
  readonly targetWebContents: WebContentsView;

  constructor(targetWebContents: WebContentsView, commands: Partial<BrowserCommandMap> = {}) {
    this.targetWebContents = targetWebContents;
    this.commands = { ...ElectronInputSimulator.DEFAULT_BROWSER_COMMANDS, ...commands };
  }

  get webContents() {
    return this.targetWebContents.webContents;
  }

  /**
   * 验证坐标点是否有效
   */
  private validatePosition(position: PointCoordinates): void {
    if (!position || (position.x === 0 && position.y === 0)) {
      throw new Error('Invalid click coordinates');
    }
  }

  /**
   * 模拟键盘输入文本
   */
  async simulateKeyboardInput(text: string): Promise<void> {
    if (!text) {
      return;
    }

    try {
      // 检测是否包含中文字符
      if (this.containsChineseCharacters(text)) {
        await this.simulateChineseInput(text);
        return;
      }

      // 逐字符输入
      for (const char of text) {
        await this.typeCharacter(char);
      }

      // 输入完成后添加短暂延迟
      await sleep(ElectronInputSimulator.INPUT_DELAYS.KEYBOARD.AFTER_TYPING);
    } catch (error) {
      throw new Error(`Keyboard input simulation failed: ${(error as Error).message}`);
    }
  }

  /**
   * 判断文本是否包含中文字符
   */
  private containsChineseCharacters(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  /**
   * 输入单个字符
   */
  private async typeCharacter(char: string): Promise<void> {
    const isUpperCase = /[A-Z]/.test(char);
    const modifiers = isUpperCase ? (['shift'] as InputEvent['modifiers']) : undefined;

    // 发送按键事件序列
    await this.sendKeySequence(char, modifiers);

    // 添加随机延迟模拟真实输入
    await sleep(
      random(
        ElectronInputSimulator.INPUT_DELAYS.KEYBOARD.BETWEEN_CHARS.MIN,
        ElectronInputSimulator.INPUT_DELAYS.KEYBOARD.BETWEEN_CHARS.MAX,
      ),
    );
  }

  // 发送鼠标点击序列
  async simulateMouseClickSequence(position: PointCoordinates, clickCount = 1): Promise<void> {
    this.validatePosition(position);

    try {
      // 执行鼠标移动动画
      await this.sendCommandToWebContents(
        this.commands.mouseAnimationCommand,
        position.x.toString(),
        position.y.toString(),
      );

      // 定义鼠标事件序列
      const mouseEvents: MouseInputEvent[] = [
        { type: 'mouseEnter', x: position.x, y: position.y, button: 'left' },
        { type: 'mouseDown', x: position.x, y: position.y, button: 'left', clickCount },
        { type: 'mouseUp', x: position.x, y: position.y, button: 'left' },
      ];

      // 按顺序发送鼠标事件
      for (const event of mouseEvents) {
        await this.sendEventToWebContents(event);
        await sleep(ElectronInputSimulator.INPUT_DELAYS.MOUSE.CLICK);
      }

      await sleep(ElectronInputSimulator.INPUT_DELAYS.MOUSE.AFTER_CLICK);
    } catch (error) {
      throw new Error(`Mouse click sequence simulation failed: ${(error as Error).message}`);
    }
  }

  /**
   * 发送按键序列（按下-字符-释放）
   */
  private async sendKeySequence(
    keyCode: string,
    modifiers?: InputEvent['modifiers'],
  ): Promise<void> {
    const keyEvents: KeyboardInputEvent[] = [
      { type: 'keyDown', keyCode, modifiers },
      { type: 'char', keyCode, modifiers },
      { type: 'keyUp', keyCode, modifiers },
    ];

    for (const event of keyEvents) {
      await this.sendEventToWebContents(event);
      await sleep(ElectronInputSimulator.INPUT_DELAYS.KEYBOARD.KEY_PRESS);
    }
  }

  /**
   * 模拟中文输入
   */
  async simulateChineseInput(text: string): Promise<void> {
    try {
      const words = cut(text);
      let currentText = '';

      for (const word of words) {
        // 获取拼音
        const chars = _pinyin(word, {
          style: _pinyin.STYLE_NORMAL,
        }).join(',');

        // 输入拼音
        await this.simulateKeyboardInput(chars);

        // 更新文本并设置到元素
        currentText += word;
        const objectId = await this.sendCommandToWebContents(
          this.commands.getActiveElementObjectIdCommand,
        );

        await this.sendCommandToWebContents(
          this.commands.setEditableValueCommand,
          currentText,
          objectId,
        );

        await sleep(ElectronInputSimulator.INPUT_DELAYS.CHINESE.CHAR);
      }

      await sleep(ElectronInputSimulator.INPUT_DELAYS.CHINESE.AFTER_INPUT);

      // 发送回车键确认
      await this.sendKeySequence('Enter');
    } catch (error) {
      throw new Error(`Chinese input simulation failed: ${(error as Error).message}`);
    }
  }

  async setInputElementValue(position: PointCoordinates, value: string): Promise<void> {
    await this.simulateMouseClickSequence(position, 3);
    await this.simulateKeyboardInput(value);
    await this.sendCommandToWebContents(this.commands.elementBlurCommand);
  }

  /**
   * 在指定坐标设置输入值，支持重试
   */
  async setValueAtCoordinates(
    position: PointCoordinates,
    value: string,
    retryCount = 0,
  ): Promise<void> {
    const MAX_RETRIES = 5;

    if (retryCount >= MAX_RETRIES) {
      throw new Error('Failed to get focus element, maximum retry count reached');
    }

    try {
      // 点击元素获取焦点
      // 点3下可以保证全选输入框内容
      await this.simulateMouseClickSequence(position, 3);

      // 获取当前活动元素ID
      const objectId = await this.sendCommandToWebContents(
        this.commands.getActiveElementObjectIdCommand,
      );

      if (!objectId) {
        await sleep(300); // 稍微等待后重试
        return this.setValueAtCoordinates(position, value, retryCount + 1);
      }

      // 检查元素是否可编辑
      const isEditableElement = await this.sendCommandToWebContents(
        this.commands.isEditableElementCommand,
        objectId,
      );
      if (!isEditableElement) {
        throw new Error('The element at the current position is not editable, cannot set value');
      }

      // 输入文本
      await this.simulateKeyboardInput(value);

      // 移除焦点
      await this.sendCommandToWebContents(this.commands.elementBlurCommand);
    } catch (error) {
      if (retryCount < MAX_RETRIES - 1) {
        await sleep(500); // 失败后等待更长时间再重试
        return this.setValueAtCoordinates(position, value, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * 将元素ID转换为DOM对象ID
   */
  async elementIdConvertObjectId(elementId: number): Promise<string> {
    return (await this.sendCommandToWebContents(
      this.commands.elementIdConvertObjectIdCommand,
      elementId,
    )) as string;
  }

  /**
   * 获取元素中心点坐标
   */
  async getElementCenter(objectId: string): Promise<PointCoordinates> {
    try {
      const rect = (await this.sendCommandToWebContents(
        this.commands.getBoundingClientRectCommand,
        objectId,
      )) as BoundingClientRect;

      if (!rect || typeof rect.left !== 'number') {
        throw new Error(
          `Failed to get element position information${JSON.stringify(rect)} ${this.commands.getBoundingClientRectCommand}`,
        );
      }

      return {
        x: Math.floor(rect.left + rect.width / 2),
        y: Math.floor(rect.top + rect.height / 2),
      };
    } catch (error) {
      throw new Error(`Failed to get element center: ${(error as Error).message}`);
    }
  }

  /**
   * 向下滚动页面
   */
  async scrollDown(): Promise<void> {
    try {
      const dimensions = await this.getWindowDimensions();
      const scrollDistance = Math.floor(dimensions.height / 3);

      await this.sendEventToWebContents({
        type: 'mouseWheel',
        x: Math.floor(dimensions.width / 2),
        y: Math.floor(dimensions.height / 2),
        deltaX: 0,
        deltaY: -(dimensions.height - scrollDistance),
        canScroll: true,
      });
    } catch (error) {
      throw new Error(`Page scroll down failed: ${(error as Error).message}`);
    }
  }

  /**
   * 向上滚动页面
   */
  async scrollUp(): Promise<void> {
    try {
      const dimensions = await this.getWindowDimensions();
      const scrollDistance = Math.floor(dimensions.height / 3);

      await this.sendEventToWebContents({
        type: 'mouseWheel',
        x: Math.floor(dimensions.width / 2),
        y: Math.floor(dimensions.height / 2),
        deltaX: 0,
        deltaY: scrollDistance,
        canScroll: true,
      });
    } catch (error) {
      throw new Error(`Page scroll up failed: ${(error as Error).message}`);
    }
  }

  /**
   * 获取窗口尺寸
   */
  private async getWindowDimensions(): Promise<{ width: number; height: number }> {
    this.validateWebContents();

    try {
      const dimensions = await this.targetWebContents.webContents.executeJavaScript(
        '({width: window.innerWidth, height: window.innerHeight})',
      );

      if (
        typeof dimensions.width !== 'number' ||
        dimensions.width <= 0 ||
        typeof dimensions.height !== 'number' ||
        dimensions.height <= 0
      ) {
        throw new Error('Invalid window dimensions');
      }

      return dimensions;
    } catch (error) {
      throw new Error(`Failed to get window dimensions: ${(error as Error).message}`);
    }
  }

  /**
   * 获取窗口高度
   */
  private async getWindowHeight(): Promise<number> {
    const dimensions = await this.getWindowDimensions();
    return dimensions.height;
  }

  /**
   * 发送输入事件到WebContents
   */
  async sendEventToWebContents(event: InputEventType): Promise<void> {
    this.validateWebContents();

    try {
      this.targetWebContents.webContents.focus();
      await sleep(ElectronInputSimulator.INPUT_DELAYS.KEYBOARD.KEY_PRESS);
      this.targetWebContents.webContents.sendInputEvent(event);
    } catch (error) {
      throw new Error(`Failed to send event to WebContents: ${(error as Error).message}`);
    }
  }

  /**
   * 发送命令到WebContents
   */
  async sendCommandToWebContents(command: string, ...params: unknown[]): Promise<unknown> {
    this.validateWebContents();
    this.validateCommand(command);

    try {
      return await this.targetWebContents.webContents.executeJavaScript(
        `window.${command}(${params.map((p) => JSON.stringify(p)).join(',')})`,
      );
    } catch (error) {
      throw new Error(`Failed to execute command ${command}: ${(error as Error).message}`);
    }
  }

  /**
   * 验证WebContents是否有效
   */
  private validateWebContents(): void {
    if (!this.targetWebContents || !this.targetWebContents.webContents) {
      throw new Error('targetWebContents is not set or invalid');
    }
  }

  /**
   * 验证命令名称是否有效
   */
  private validateCommand(command: string): void {
    if (!command || !/^[a-zA-Z_$][a-zA-Z0-9_$\.]*$/.test(command)) {
      throw new Error(`Invalid command name: ${command}`);
    }
  }
}
