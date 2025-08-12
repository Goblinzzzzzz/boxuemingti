/**
 * 全局加载状态指示器和错误处理组件
 * 提供统一的加载状态和错误处理用户体验
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// 加载状态类型
type LoadingState = {
  isLoading: boolean;
  message?: string;
  progress?: number;
  type?: 'default' | 'upload' | 'download' | 'processing';
};

// 错误类型
type ErrorState = {
  hasError: boolean;
  message?: string;
  type?: 'network' | 'server' | 'validation' | 'unknown';
  retryable?: boolean;
  onRetry?: () => void;
};

// 网络状态
type NetworkState = {
  isOnline: boolean;
  isSlowConnection: boolean;
};

// 全局状态接口
interface GlobalStateContextType {
  loading: LoadingState;
  error: ErrorState;
  network: NetworkState;
  setLoading: (state: Partial<LoadingState>) => void;
  setError: (state: Partial<ErrorState>) => void;
  clearError: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// 创建上下文
const GlobalStateContext = createContext<GlobalStateContextType | null>(null);

// 全局状态提供者
export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoadingState] = useState<LoadingState>({
    isLoading: false
  });
  
  const [error, setErrorState] = useState<ErrorState>({
    hasError: false
  });
  
  const [network, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    isSlowConnection: false
  });

  // 设置加载状态
  const setLoading = useCallback((state: Partial<LoadingState>) => {
    setLoadingState(prev => ({ ...prev, ...state }));
  }, []);

  // 设置错误状态
  const setError = useCallback((state: Partial<ErrorState>) => {
    setErrorState(prev => ({ ...prev, hasError: true, ...state }));
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setErrorState({ hasError: false });
  }, []);

  // 显示提示
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    toast[type](message);
  }, []);

  // 监听网络状态
  React.useEffect(() => {
    const handleOnline = () => {
      setNetworkState(prev => ({ ...prev, isOnline: true }));
      showToast('网络连接已恢复', 'success');
    };
    
    const handleOffline = () => {
      setNetworkState(prev => ({ ...prev, isOnline: false }));
      showToast('网络连接已断开', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // 检测慢速连接
  React.useEffect(() => {
    const connection = (navigator as any).connection;
    if (connection) {
      const updateConnectionInfo = () => {
        const isSlowConnection = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
        setNetworkState(prev => ({ ...prev, isSlowConnection }));
      };
      
      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
      
      return () => {
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }
  }, []);

  const value: GlobalStateContextType = {
    loading,
    error,
    network,
    setLoading,
    setError,
    clearError,
    showToast
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
      <GlobalLoadingIndicator />
      <GlobalErrorHandler />
      <NetworkStatusIndicator />
    </GlobalStateContext.Provider>
  );
};

// 使用全局状态的 Hook
export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within GlobalStateProvider');
  }
  return context;
};

// 全局加载指示器
const GlobalLoadingIndicator: React.FC = () => {
  const { loading } = useGlobalState();

  if (!loading.isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {loading.type === 'upload' ? (
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            ) : loading.type === 'download' ? (
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
            ) : loading.type === 'processing' ? (
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            ) : (
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {loading.message || '加载中...'}
            </div>
            {loading.progress !== undefined && (
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loading.progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(loading.progress)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 全局错误处理器
const GlobalErrorHandler: React.FC = () => {
  const { error, clearError } = useGlobalState();

  if (!error.hasError) return null;

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <WifiOff className="h-6 w-6 text-red-500" />;
      case 'server':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return '网络连接错误';
      case 'server':
        return '服务器错误';
      case 'validation':
        return '数据验证错误';
      default:
        return '发生错误';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getErrorIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {getErrorTitle()}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {error.message || '请稍后重试或联系技术支持'}
            </p>
            <div className="flex space-x-3">
              {error.retryable && error.onRetry && (
                <button
                  onClick={error.onRetry}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重试
                </button>
              )}
              <button
                onClick={clearError}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
          <button
            onClick={clearError}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 网络状态指示器
const NetworkStatusIndicator: React.FC = () => {
  const { network } = useGlobalState();
  const [showIndicator, setShowIndicator] = useState(false);

  React.useEffect(() => {
    if (!network.isOnline || network.isSlowConnection) {
      setShowIndicator(true);
      const timer = setTimeout(() => setShowIndicator(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowIndicator(false);
    }
  }, [network.isOnline, network.isSlowConnection]);

  if (!showIndicator) return null;

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className={cn(
        'flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg',
        !network.isOnline 
          ? 'bg-red-100 text-red-800 border border-red-200'
          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      )}>
        {!network.isOnline ? (
          <WifiOff className="h-4 w-4" />
        ) : (
          <Wifi className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {!network.isOnline 
            ? '网络连接已断开' 
            : '网络连接较慢'
          }
        </span>
      </div>
    </div>
  );
};

// 页面级加载组件
export const PageLoader: React.FC<{ 
  message?: string;
  className?: string;
}> = ({ message = '加载中...', className }) => {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

// 内联加载组件
export const InlineLoader: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-4'
  };

  return (
    <div className={cn(
      'border-gray-200 border-t-blue-600 rounded-full animate-spin',
      sizeClasses[size],
      className
    )} />
  );
};

// 按钮加载状态
export const LoadingButton: React.FC<{
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}> = ({ 
  loading = false, 
  children, 
  onClick, 
  disabled, 
  className,
  variant = 'primary'
}) => {
  const baseClasses = 'inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {loading && (
        <InlineLoader size="sm" className="mr-2" />
      )}
      {children}
    </button>
  );
};

// 错误边界组件
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">出现了一些问题</h3>
            <p className="text-gray-600 mb-4">页面加载时发生错误，请刷新页面重试</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default {
  GlobalStateProvider,
  useGlobalState,
  PageLoader,
  InlineLoader,
  LoadingButton,
  ErrorBoundary
};