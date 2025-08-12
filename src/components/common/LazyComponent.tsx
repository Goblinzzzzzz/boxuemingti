/**
 * 懒加载组件包装器
 * 用于实现组件的按需加载和性能优化
 */
import React, { Suspense, lazy, ComponentType, LazyExoticComponent } from 'react';
import { Skeleton } from './SkeletonLoader';
import { performanceMonitor } from '@/utils/performance';

interface LazyComponentProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// 默认加载组件
const DefaultFallback: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="space-y-3 w-full max-w-md">
      <Skeleton height={24} width="60%" />
      <Skeleton height={16} width="100%" />
      <Skeleton height={16} width="80%" />
      <Skeleton height={40} width="120px" />
    </div>
  </div>
);

// 默认错误组件
const DefaultErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="text-red-500 text-lg font-medium mb-2">组件加载失败</div>
      <div className="text-gray-600 text-sm mb-4">
        {error?.message || '请检查网络连接或刷新页面重试'}
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        刷新页面
      </button>
    </div>
  </div>
);

// 错误边界组件
class LazyErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error) => void;
  },
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
    console.error('LazyComponent Error:', error, errorInfo);
    this.props.onError?.(error);
    
    // 记录性能数据
    console.error('Component load error:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

// 创建懒加载组件的工厂函数
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyComponentProps = {}
): LazyExoticComponent<T> {
  const LazyComp = lazy(async () => {
    const startTime = performance.now();
    
    try {
      const module = await importFunc();
      const endTime = performance.now();
      
      // 记录组件加载时间
      performanceMonitor.recordMetric('component_load_time', endTime - startTime, 'custom');
      
      options.onLoad?.();
      return module;
    } catch (error) {
      const endTime = performance.now();
      
      // 记录加载错误
      console.error('Component load failed:', error instanceof Error ? error.message : 'Unknown error');
      
      options.onError?.(error instanceof Error ? error : new Error('Component load failed'));
      throw error;
    }
  });

  return LazyComp;
}

// 懒加载组件包装器
export const LazyComponent: React.FC<{
  component: LazyExoticComponent<any>;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  [key: string]: any;
}> = ({ 
  component: Component, 
  fallback, 
  errorFallback, 
  onLoad, 
  onError, 
  ...props 
}) => {
  return (
    <LazyErrorBoundary fallback={errorFallback} onError={onError}>
      <Suspense fallback={fallback || <DefaultFallback />}>
        <Component {...props} />
      </Suspense>
    </LazyErrorBoundary>
  );
};

// 预加载函数
export function preloadComponent<T extends ComponentType<any>>(
  lazyComponent: LazyExoticComponent<T>
): Promise<void> {
  // 触发组件的预加载
  return new Promise((resolve, reject) => {
    const componentImport = (lazyComponent as any)._payload?._result;
    
    if (componentImport) {
      // 组件已经加载
      resolve();
    } else {
      // 触发加载
      try {
        const loadPromise = (lazyComponent as any)._payload?._result || 
                           (lazyComponent as any)._ctor?.();
        
        if (loadPromise && typeof loadPromise.then === 'function') {
          loadPromise.then(resolve).catch(reject);
        } else {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    }
  });
}

// 批量预加载组件
export function preloadComponents(
  components: LazyExoticComponent<any>[]
): Promise<void[]> {
  return Promise.all(components.map(preloadComponent));
}

// Hook：用于组件预加载
export function usePreloadComponent(
  lazyComponent: LazyExoticComponent<any>,
  condition: boolean = true
) {
  React.useEffect(() => {
    if (condition) {
      preloadComponent(lazyComponent).catch(console.error);
    }
  }, [lazyComponent, condition]);
}

// Hook：用于批量组件预加载
export function usePreloadComponents(
  components: LazyExoticComponent<any>[],
  condition: boolean = true
) {
  React.useEffect(() => {
    if (condition && components.length > 0) {
      preloadComponents(components).catch(console.error);
    }
  }, [components, condition]);
}

// 智能预加载 Hook（基于用户交互）
export function useSmartPreload(
  componentMap: Record<string, LazyExoticComponent<any>>,
  currentRoute?: string
) {
  React.useEffect(() => {
    // 预加载相关路由的组件
    const preloadRoutes = getRelatedRoutes(currentRoute);
    const componentsToPreload = preloadRoutes
      .map(route => componentMap[route])
      .filter(Boolean);
    
    if (componentsToPreload.length > 0) {
      // 延迟预加载，避免影响当前页面性能
      const timer = setTimeout(() => {
        preloadComponents(componentsToPreload).catch(console.error);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [componentMap, currentRoute]);
}

// 获取相关路由（可以根据业务逻辑自定义）
function getRelatedRoutes(currentRoute?: string): string[] {
  if (!currentRoute) return [];
  
  const routeMap: Record<string, string[]> = {
    '/dashboard': ['/users', '/materials', '/questions'],
    '/users': ['/dashboard', '/system'],
    '/materials': ['/dashboard', '/questions'],
    '/questions': ['/materials', '/dashboard'],
    '/system': ['/users', '/dashboard']
  };
  
  return routeMap[currentRoute] || [];
}

// 导出类型
export type { LazyComponentProps };
export { DefaultFallback, DefaultErrorFallback, LazyErrorBoundary };