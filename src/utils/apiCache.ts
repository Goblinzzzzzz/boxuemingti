/**
 * API请求缓存和优化工具
 * 提供请求缓存、防抖、节流等性能优化功能
 */
import React from 'react';

interface CacheItem {
  data: any;
  timestamp: number;
  expiry: number;
}

interface RequestConfig {
  cache?: boolean;
  cacheTime?: number; // 缓存时间（毫秒）
  debounce?: number; // 防抖延迟（毫秒）
  throttle?: number; // 节流间隔（毫秒）
}

class ApiCache {
  private cache = new Map<string, CacheItem>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private throttleTimers = new Map<string, number>();
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * 生成缓存键
   */
  private generateCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * 获取缓存数据
   */
  private getCache(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.timestamp + item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * 设置缓存数据
   */
  private setCache(key: string, data: any, expiry: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  /**
   * 清除过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp + item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 防抖处理
   */
  private debounce<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delay: number,
    key: string
  ): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      // 清除之前的定时器
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 设置新的定时器
      const timer = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.debounceTimers.delete(key);
        }
      }, delay);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * 节流处理
   */
  private shouldThrottle(key: string, interval: number): boolean {
    const lastCall = this.throttleTimers.get(key);
    const now = Date.now();
    
    if (!lastCall || now - lastCall >= interval) {
      this.throttleTimers.set(key, now);
      return false;
    }
    
    return true;
  }

  /**
   * 优化的fetch请求
   */
  async request(
    url: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<any> {
    const {
      cache = true,
      cacheTime = 5 * 60 * 1000, // 默认5分钟缓存
      debounce,
      throttle
    } = config;

    const cacheKey = this.generateCacheKey(url, options);

    // 检查缓存
    if (cache && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
      const cachedData = this.getCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // 检查是否有相同的请求正在进行
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    // 节流检查
    if (throttle && this.shouldThrottle(cacheKey, throttle)) {
      throw new Error('Request throttled');
    }

    // 创建请求函数
    const makeRequest = async () => {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 缓存成功的响应
        if (cache && response.status === 200) {
          this.setCache(cacheKey, data, cacheTime);
        }

        return data;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    };

    // 防抖处理
    if (debounce) {
      const request = this.debounce(makeRequest, debounce, cacheKey);
      this.pendingRequests.set(cacheKey, request);
      return request;
    }

    // 普通请求
    const request = makeRequest();
    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除特定URL的缓存
   */
  clearCacheByUrl(url: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(url)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; keys: string[] } {
    this.cleanExpiredCache();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 创建全局实例
export const apiCache = new ApiCache();

// 便捷方法
export const cachedFetch = {
  get: (url: string, config?: RequestConfig) => 
    apiCache.request(url, { method: 'GET' }, config),
  
  post: (url: string, data?: any, config?: RequestConfig) => 
    apiCache.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    }, { ...config, cache: false }),
  
  put: (url: string, data?: any, config?: RequestConfig) => 
    apiCache.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, { ...config, cache: false }),
  
  delete: (url: string, config?: RequestConfig) => 
    apiCache.request(url, { method: 'DELETE' }, { ...config, cache: false })
};

// 搜索防抖hook
export const useSearchDebounce = (callback: (term: string) => void, delay: number = 300) => {
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  
  return React.useCallback((searchTerm: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(searchTerm);
    }, delay);
  }, [callback, delay]);
};

// 清理函数
export const cleanupApiCache = () => {
  apiCache.clearCache();
};