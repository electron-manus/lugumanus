import { WebContentsView } from 'electron';
import { BrowserUse, ElectronInputSimulator } from 'electron-browser-use';
import { loadSdkAndModel } from '../ai-sdk/index.js';
import { ConversionActorAgent } from './conversion-actor-agent.js';

// 定义会话代理的接口
interface BrowserAgentContext {
  agent: ConversionActorAgent;
  abortController: AbortController;
  webview: WebContentsView;
}

class ConversationAgentManager {
  private agentContexts = new Map<string, BrowserAgentContext>();

  /**
   * 移除指定ID的会话
   * @param conversationId 会话ID
   * @returns 是否成功移除
   */
  removeAgentContext(conversationId: string): boolean {
    const agentContext = this.agentContexts.get(conversationId);
    if (!agentContext) {
      return false;
    }

    // 清理资源
    agentContext.abortController.abort('agent context removed');
    agentContext.webview.webContents.close();
    agentContext.webview.removeAllListeners();
    this.agentContexts.delete(conversationId);

    return true;
  }

  /**
   * 添加或获取指定ID的会话
   * @param conversationId 会话ID
   * @returns 会话代理信息
   */
  async getOrCreateAgentContext(conversationId: string): Promise<BrowserAgentContext> {
    const agentContext = this.agentContexts.get(conversationId);
    if (agentContext) {
      return agentContext;
    }

    const models = await loadSdkAndModel();
    const abortController = new AbortController();
    const webview = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        allowRunningInsecureContent: true,
      },
    });

    const browserUse = new BrowserUse({
      browserSimulator: new ElectronInputSimulator(webview),
      models: {
        // @ts-ignore
        text: models.TEXT,
        // @ts-ignore
        longText: models.LONG_TEXT,
        // @ts-ignore
        screenshot: models.IMAGE_TO_TEXT,
      },
    });

    const newAgentContext: BrowserAgentContext = {
      agent: new ConversionActorAgent(conversationId, abortController.signal, browserUse),
      abortController,
      webview,
    };

    this.agentContexts.set(conversationId, newAgentContext);
    return newAgentContext;
  }
}

// 导出单例
export default new ConversationAgentManager();
