import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 确保环境变量正确加载
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * AI服务管理器 - 支持多个AI服务提供商和模型切换
 */

// AI提供商配置接口
interface AIProviderConfig {
  name: string;
  displayName: string;
  baseURL: string;
  models: AIModelConfig[];
  apiKeyEnv: string;
}

// AI模型配置接口
interface AIModelConfig {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

// AI服务状态接口
interface AIServiceStatus {
  available: boolean;
  provider: string;
  model: string;
  hasApiKey: boolean;
  message: string;
  allProviders: AIProviderConfig[];
}

class AIServiceManager {
  private providers: Map<string, AIProviderConfig> = new Map();
  private currentProvider: string = '';
  private currentModel: string = '';

  constructor() {
    this.initProviders();
    this.loadCurrentConfig();
  }

  /**
   * 初始化所有支持的AI提供商
   */
  private initProviders() {
    // DMXAPI配置
    this.providers.set('dmxapi', {
      name: 'dmxapi',
      displayName: 'DMXAPI',
      baseURL: 'https://www.dmxapi.cn/v1',
      apiKeyEnv: 'DMXAPI_API_KEY',
      models: [
        {
          id: 'gpt-5-mini',
          name: 'gpt-5-mini',
          displayName: 'GPT-5 Mini',
          description: 'GPT-5 Mini模型，性能优异'
        },
        {
          id: 'gpt-4.1-mini',
          name: 'gpt-4.1-mini',
          displayName: 'GPT-4.1 Mini',
          description: 'GPT-4.1 Mini模型，平衡性能和成本'
        },
        {
          id: 'doubao-seed-1-6-thinking-250615',
          name: 'doubao-seed-1-6-thinking-250615',
          displayName: 'Doubao Seed 1.6 Thinking',
          description: '字节跳动豆包Seed 1.6 Thinking模型'
        },
        {
          id: 'gemini-2.5-pro',
          name: 'gemini-2.5-pro',
          displayName: 'Gemini 2.5 Pro',
          description: 'Google Gemini 2.5 Pro模型'
        }
      ]
    });
  }

  /**
   * 加载当前配置
   */
  private loadCurrentConfig() {
    this.currentProvider = 'dmxapi'; // 固定使用DMXAPI
    this.currentModel = (process.env.DMXAPI_MODEL || 'gpt-5-mini').trim();
  }

  /**
   * 获取所有可用的AI提供商
   */
  getAllProviders(): AIProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * 获取指定提供商的配置
   */
  getProviderConfig(providerName: string): AIProviderConfig | undefined {
    return this.providers.get(providerName);
  }

  /**
   * 获取当前AI服务配置
   */
  getCurrentConfig() {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`未知的AI提供商: ${this.currentProvider}`);
    }

    const apiKey = (process.env[provider.apiKeyEnv] || '').trim();
    
    return {
      provider: this.currentProvider,
      model: this.currentModel,
      baseURL: provider.baseURL,
      apiKey,
      hasApiKey: !!apiKey
    };
  }

  /**
   * 切换AI提供商和模型
   */
  switchProvider(providerName: string, modelId?: string): boolean {
    const provider = this.providers.get(providerName);
    if (!provider) {
      console.error(`未知的AI提供商: ${providerName}`);
      return false;
    }

    // 检查API密钥是否配置
    const apiKey = (process.env[provider.apiKeyEnv] || '').trim();
    if (!apiKey) {
      console.error(`${provider.displayName} API密钥未配置`);
      return false;
    }

    // 验证模型是否存在
    if (modelId) {
      const model = provider.models.find(m => m.id === modelId);
      if (!model) {
        console.error(`提供商 ${providerName} 不支持模型 ${modelId}`);
        return false;
      }
      this.currentModel = modelId;
    } else {
      // 使用默认模型
      this.currentModel = provider.models[0]?.id || '';
    }

    this.currentProvider = providerName;
    console.log(`✅ 已切换到 ${provider.displayName} - ${this.currentModel}`);
    return true;
  }

  /**
   * 获取AI服务状态
   */
  getStatus(): AIServiceStatus {
    const config = this.getCurrentConfig();
    const provider = this.providers.get(this.currentProvider);
    
    return {
      available: config.hasApiKey,
      provider: this.currentProvider,
      model: this.currentModel,
      hasApiKey: config.hasApiKey,
      message: config.hasApiKey ? 
        `✅ ${provider?.displayName || this.currentProvider}服务已配置` : 
        `⚠️ ${provider?.displayName || this.currentProvider}服务未配置，请配置API密钥后使用`,
      allProviders: this.getAllProviders()
    };
  }

  /**
   * 验证提供商和模型组合是否有效
   */
  validateProviderModel(providerName: string, modelId: string): boolean {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return false;
    }

    return provider.models.some(model => model.id === modelId);
  }
}

// 导出服务实例
export const aiServiceManager = new AIServiceManager();
export default aiServiceManager;

// 导出类型
export type { AIProviderConfig, AIModelConfig, AIServiceStatus };