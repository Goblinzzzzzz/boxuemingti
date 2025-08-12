/**
 * 性能监控工具
 * 用于监控页面加载时间、API响应时间等性能指标
 */
import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'api' | 'render' | 'custom';
}

interface ApiMetric {
  url: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: ApiMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  /**
   * 初始化性能观察器
   */
  private initializeObservers(): void {
    // 观察导航时间
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordMetric('page-load', navEntry.loadEventEnd - navEntry.fetchStart, 'navigation');
              this.recordMetric('dom-content-loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart, 'navigation');
              this.recordMetric('first-paint', navEntry.responseEnd - navEntry.fetchStart, 'navigation');
            }
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }

      // 观察资源加载时间
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              if (resourceEntry.name.includes('/api/')) {
                this.recordApiMetric(
                  resourceEntry.name,
                  'GET',
                  resourceEntry.responseEnd - resourceEntry.fetchStart,
                  200
                );
              }
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }

      // 观察最大内容绘制 (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('largest-contentful-paint', lastEntry.startTime, 'render');
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // 观察首次输入延迟 (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('first-input-delay', (entry as any).processingStart - entry.startTime, 'render');
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }
    }
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, type: PerformanceMetric['type'] = 'custom'): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      type
    });

    // 保持最近1000条记录
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * 记录API性能指标
   */
  recordApiMetric(url: string, method: string, duration: number, status: number): void {
    this.apiMetrics.push({
      url,
      method,
      duration,
      status,
      timestamp: Date.now()
    });

    // 保持最近500条记录
    if (this.apiMetrics.length > 500) {
      this.apiMetrics = this.apiMetrics.slice(-500);
    }
  }

  /**
   * 测量函数执行时间
   */
  async measureFunction<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'custom');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}-error`, duration, 'custom');
      throw error;
    }
  }

  /**
   * 测量组件渲染时间
   */
  measureRender(componentName: string): { start: () => void; end: () => void } {
    let startTime: number;
    
    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric(`render-${componentName}`, duration, 'render');
      }
    };
  }

  /**
   * 获取性能统计
   */
  getStats(): {
    navigation: PerformanceMetric[];
    api: ApiMetric[];
    render: PerformanceMetric[];
    custom: PerformanceMetric[];
    summary: {
      avgPageLoad: number;
      avgApiResponse: number;
      slowestApi: ApiMetric | null;
      totalMetrics: number;
    };
  } {
    const navigation = this.metrics.filter(m => m.type === 'navigation');
    const render = this.metrics.filter(m => m.type === 'render');
    const custom = this.metrics.filter(m => m.type === 'custom');
    
    const avgPageLoad = navigation.length > 0 
      ? navigation.reduce((sum, m) => sum + m.value, 0) / navigation.length 
      : 0;
    
    const avgApiResponse = this.apiMetrics.length > 0
      ? this.apiMetrics.reduce((sum, m) => sum + m.duration, 0) / this.apiMetrics.length
      : 0;
    
    const slowestApi = this.apiMetrics.length > 0
      ? this.apiMetrics.reduce((slowest, current) => 
          current.duration > slowest.duration ? current : slowest
        )
      : null;

    return {
      navigation,
      api: this.apiMetrics,
      render,
      custom,
      summary: {
        avgPageLoad,
        avgApiResponse,
        slowestApi,
        totalMetrics: this.metrics.length + this.apiMetrics.length
      }
    };
  }

  /**
   * 获取Web Vitals指标
   */
  getWebVitals(): {
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
  } {
    const lcp = this.metrics.find(m => m.name === 'largest-contentful-paint')?.value;
    const fid = this.metrics.find(m => m.name === 'first-input-delay')?.value;
    
    return { lcp, fid };
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    this.metrics = [];
    this.apiMetrics = [];
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clear();
  }
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor();

// React Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const measureRender = React.useCallback((componentName: string) => {
    return performanceMonitor.measureRender(componentName);
  }, []);

  const recordMetric = React.useCallback((name: string, value: number) => {
    performanceMonitor.recordMetric(name, value);
  }, []);

  const getStats = React.useCallback(() => {
    return performanceMonitor.getStats();
  }, []);

  return { measureRender, recordMetric, getStats };
};

// 装饰器用于自动测量函数性能
export const measurePerformance = (name: string) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measureFunction(
        `${name || propertyKey}`,
        () => originalMethod.apply(this, args)
      );
    };
    
    return descriptor;
  };
};

// 工具函数
export const logPerformanceStats = () => {
  const stats = performanceMonitor.getStats();
  console.group('🚀 Performance Stats');
  console.log('Average Page Load:', `${stats.summary.avgPageLoad.toFixed(2)}ms`);
  console.log('Average API Response:', `${stats.summary.avgApiResponse.toFixed(2)}ms`);
  if (stats.summary.slowestApi) {
    console.log('Slowest API:', stats.summary.slowestApi.url, `${stats.summary.slowestApi.duration.toFixed(2)}ms`);
  }
  console.log('Total Metrics:', stats.summary.totalMetrics);
  console.groupEnd();
};

// 在开发环境下自动记录性能统计
if (process.env.NODE_ENV === 'development') {
  // 页面加载完成后记录统计
  window.addEventListener('load', () => {
    setTimeout(() => {
      logPerformanceStats();
    }, 1000);
  });
}