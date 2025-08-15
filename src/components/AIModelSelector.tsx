import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

interface AIModelSelectorProps {
  className?: string;
  onModelChange?: (provider: string, model: string) => void;
}

const AIModelSelector: React.FC<AIModelSelectorProps> = ({ 
  className = '',
  onModelChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AIServiceStatus | null>(null);
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);

  // 获取AI服务状态
  const fetchAIStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('未找到认证token');
        return;
      }

      const response = await fetch('/api/ai/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`获取AI状态失败: ${response.status}`);
      }

      const data = await response.json();
      setStatus(data);
      
      // 如果状态中包含所有提供商信息，直接使用
      if (data.allProviders) {
        setProviders(data.allProviders);
      } else {
        // 否则单独获取提供商列表
        await fetchProviders();
      }
    } catch (error) {
      console.error('获取AI服务状态失败:', error);
      toast.error('获取AI服务状态失败');
    }
  };

  // 获取AI提供商列表
  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch('/api/ai/providers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`获取提供商列表失败: ${response.status}`);
      }

      const data = await response.json();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('获取AI提供商列表失败:', error);
    }
  };

  // 切换AI提供商和模型
  const switchModel = async (providerName: string, modelId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch('/api/ai/switch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: providerName,
          model: modelId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '切换模型失败');
      }

      if (data.success) {
        toast.success(data.message || '模型切换成功');
        setStatus(data.status);
        setIsOpen(false);
        
        // 通知父组件模型已切换
        if (onModelChange) {
          onModelChange(providerName, modelId);
        }
      } else {
        throw new Error(data.message || '切换模型失败');
      }
    } catch (error) {
      console.error('切换AI模型失败:', error);
      toast.error(error instanceof Error ? error.message : '切换模型失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取状态
  useEffect(() => {
    fetchAIStatus();
  }, []);

  // 获取当前选中的提供商和模型信息
  const getCurrentProvider = () => {
    return providers.find(p => p.name === status?.provider);
  };

  const getCurrentModel = () => {
    const provider = getCurrentProvider();
    return provider?.models.find(m => m.id === status?.model);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        disabled={loading}
      >
        <Settings className="w-4 h-4 text-gray-500" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-900">
            AI模型
          </span>
          <span className="text-xs text-gray-500">
            {getCurrentModel()?.displayName || status?.model || '未知模型'}
          </span>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} />
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">选择AI模型</h3>
            <p className="text-xs text-gray-500 mt-1">
              当前状态: {status?.message || '未知'}
            </p>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-2">
            {providers.length > 0 && providers[0].models.map((model) => {
              const isSelected = status?.model === model.id;
              
              return (
                <button
                  key={model.id}
                  onClick={() => switchModel('dmxapi', model.id)}
                  disabled={loading}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors mb-2 ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-50 text-gray-700 border border-gray-100'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {model.displayName}
                    </div>
                    {model.description && (
                      <div className="text-xs text-gray-500 mt-1">
                        {model.description}
                      </div>
                    )}
                  </div>
                  
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
          
          {providers.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">暂无可用的AI模型</p>
              <p className="text-xs mt-1">请检查API配置</p>
            </div>
          )}
        </div>
      )}
      
      {/* 点击外部关闭下拉菜单 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export { AIModelSelector };
export default AIModelSelector;