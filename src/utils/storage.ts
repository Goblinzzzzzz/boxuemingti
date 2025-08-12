/**
 * 智能本地存储管理器
 * 实现数据缓存、预加载和存储优化策略
 */
import React from 'react';
import { performanceMonitor } from './performance';

// 存储配置
interface StorageConfig {
  maxSize: number; // 最大存储大小（字节）
  maxAge: number; // 最大缓存时间（毫秒）
  compression: boolean; // 是否启用压缩
  encryption: boolean; // 是否启用加密
}

// 缓存项接口
interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiry?: number;
  size: number;
  accessCount: number;
  lastAccess: number;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
}

// 存储统计
interface StorageStats {
  totalSize: number;
  itemCount: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

class SmartStorage {
  private config: StorageConfig;
  private cache = new Map<string, CacheItem>();
  private stats: StorageStats = {
    totalSize: 0,
    itemCount: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0
  };
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      compression: true,
      encryption: false,
      ...config
    };

    // 初始化时从 localStorage 恢复数据
    this.loadFromLocalStorage();
    
    // 定期清理过期数据
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // 每5分钟清理一次
    
    // 页面卸载时保存数据
    window.addEventListener('beforeunload', () => this.saveToLocalStorage());
  }

  // 设置缓存项
  set<T>(
    key: string, 
    data: T, 
    options: {
      expiry?: number;
      priority?: 'low' | 'medium' | 'high';
      tags?: string[];
    } = {}
  ): boolean {
    const startTime = performance.now();
    
    try {
      const serialized = this.serialize(data);
      const size = this.calculateSize(serialized);
      
      // 检查是否超过最大大小限制
      if (size > this.config.maxSize / 4) {
        console.warn(`Cache item too large: ${key} (${size} bytes)`);
        return false;
      }
      
      // 确保有足够空间
      this.ensureSpace(size);
      
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: options.expiry || (Date.now() + this.config.maxAge),
        size,
        accessCount: 0,
        lastAccess: Date.now(),
        priority: options.priority || 'medium',
        tags: options.tags
      };
      
      // 如果键已存在，先移除旧数据
      if (this.cache.has(key)) {
        const oldItem = this.cache.get(key)!;
        this.stats.totalSize -= oldItem.size;
      } else {
        this.stats.itemCount++;
      }
      
      this.cache.set(key, item);
      this.stats.totalSize += size;
      
      // 记录性能
      const endTime = performance.now();
      performanceMonitor.recordMetric('storage_set_time', endTime - startTime, 'custom');
      
      return true;
    } catch (error) {
      console.error('Failed to set cache item:', error);
      console.error('Storage set failed:', error);
      return false;
    }
  }

  // 获取缓存项
  get<T>(key: string): T | null {
    const startTime = performance.now();
    
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    
    if (!item) {
      this.missCount++;
      this.updateHitRate();
      return null;
    }
    
    // 检查是否过期
    if (item.expiry && Date.now() > item.expiry) {
      this.delete(key);
      this.missCount++;
      this.updateHitRate();
      return null;
    }
    
    // 更新访问统计
    item.accessCount++;
    item.lastAccess = Date.now();
    this.hitCount++;
    this.updateHitRate();
    
    // 记录性能
    const endTime = performance.now();
    performanceMonitor.recordMetric('storage_get_time', endTime - startTime, 'custom');
    
    return item.data;
  }

  // 删除缓存项
  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.stats.totalSize -= item.size;
      this.stats.itemCount--;
      return true;
    }
    return false;
  }

  // 检查键是否存在且未过期
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  // 清空所有缓存
  clear(): void {
    this.cache.clear();
    this.stats = {
      totalSize: 0,
      itemCount: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: this.evictionCount
    };
  }

  // 根据标签删除缓存项
  deleteByTag(tag: string): number {
    let deletedCount = 0;
    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.includes(tag)) {
        this.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  // 获取所有键
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // 获取存储统计
  getStats(): StorageStats {
    return { ...this.stats };
  }

  // 预加载数据
  async preload(keys: string[], fetcher: (key: string) => Promise<any>): Promise<void> {
    const startTime = performance.now();
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await fetcher(key);
          this.set(key, data, { priority: 'low' });
        } catch (error) {
          console.warn(`Failed to preload ${key}:`, error);
        }
      }
    });
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    performanceMonitor.recordMetric('storage_preload_time', endTime - startTime, 'custom');
  }

  // 批量设置
  setBatch<T>(items: Array<{ key: string; data: T; options?: any }>): number {
    let successCount = 0;
    for (const item of items) {
      if (this.set(item.key, item.data, item.options)) {
        successCount++;
      }
    }
    return successCount;
  }

  // 批量获取
  getBatch<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }
    return result;
  }

  // 确保有足够的存储空间
  private ensureSpace(requiredSize: number): void {
    while (this.stats.totalSize + requiredSize > this.config.maxSize) {
      const evicted = this.evictLeastUsed();
      if (!evicted) break; // 无法释放更多空间
    }
  }

  // 驱逐最少使用的项目
  private evictLeastUsed(): boolean {
    let leastUsedKey: string | null = null;
    let leastUsedScore = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      // 计算使用分数（访问次数 / 时间差 + 优先级权重）
      const timeDiff = Date.now() - item.lastAccess;
      const priorityWeight = item.priority === 'high' ? 3 : item.priority === 'medium' ? 2 : 1;
      const score = (item.accessCount * priorityWeight) / (timeDiff + 1);
      
      if (score < leastUsedScore) {
        leastUsedScore = score;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.delete(leastUsedKey);
      this.evictionCount++;
      this.stats.evictionCount++;
      return true;
    }
    
    return false;
  }

  // 清理过期数据
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && now > item.expiry) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      performanceMonitor.recordMetric('storage_cleanup_count', expiredKeys.length, 'custom');
    }
  }

  // 序列化数据
  private serialize<T>(data: T): string {
    try {
      const json = JSON.stringify(data);
      return this.config.compression ? this.compress(json) : json;
    } catch (error) {
      throw new Error(`Failed to serialize data: ${error}`);
    }
  }

  // 反序列化数据
  private deserialize<T>(serialized: string): T {
    try {
      const json = this.config.compression ? this.decompress(serialized) : serialized;
      return JSON.parse(json);
    } catch (error) {
      throw new Error(`Failed to deserialize data: ${error}`);
    }
  }

  // 简单压缩（实际项目中可以使用更好的压缩算法）
  private compress(str: string): string {
    // 这里使用简单的压缩，实际项目中可以使用 LZ-string 等库
    return btoa(str);
  }

  // 简单解压缩
  private decompress(compressed: string): string {
    return atob(compressed);
  }

  // 计算数据大小
  private calculateSize(data: string): number {
    return new Blob([data]).size;
  }

  // 更新命中率
  private updateHitRate(): void {
    const total = this.hitCount + this.missCount;
    this.stats.hitRate = total > 0 ? this.hitCount / total : 0;
    this.stats.missRate = total > 0 ? this.missCount / total : 0;
  }

  // 保存到 localStorage
  private saveToLocalStorage(): void {
    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };
      localStorage.setItem('smart_storage', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  // 从 localStorage 加载
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('smart_storage');
      if (stored) {
        const data = JSON.parse(stored);
        
        // 检查数据是否过期（超过配置的最大年龄）
        if (Date.now() - data.timestamp < this.config.maxAge) {
          this.cache = new Map(data.cache);
          this.stats = data.stats || this.stats;
          
          // 清理过期项目
          this.cleanup();
        }
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
    }
  }
}

// 创建默认实例
export const smartStorage = new SmartStorage();

// 创建特定用途的存储实例
export const createStorage = (config?: Partial<StorageConfig>) => {
  return new SmartStorage(config);
};

// 用户数据存储
export const userStorage = createStorage({
  maxSize: 10 * 1024 * 1024, // 10MB
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
  compression: true
});

// 临时数据存储
export const tempStorage = createStorage({
  maxSize: 5 * 1024 * 1024, // 5MB
  maxAge: 60 * 60 * 1000, // 1小时
  compression: false
});

// 缓存 Hook
export function useStorage<T>(
  key: string,
  initialValue?: T,
  storage: SmartStorage = smartStorage
) {
  const [value, setValue] = React.useState<T | null>(() => {
    const cached = storage.get<T>(key);
    return cached !== null ? cached : initialValue || null;
  });

  const setStoredValue = React.useCallback((newValue: T, options?: any) => {
    setValue(newValue);
    storage.set(key, newValue, options);
  }, [key, storage]);

  const removeValue = React.useCallback(() => {
    setValue(null);
    storage.delete(key);
  }, [key, storage]);

  return [value, setStoredValue, removeValue] as const;
}

// 预加载 Hook
export function usePreload(
  keys: string[],
  fetcher: (key: string) => Promise<any>,
  storage: SmartStorage = smartStorage
) {
  React.useEffect(() => {
    storage.preload(keys, fetcher).catch(console.error);
  }, [keys, fetcher, storage]);
}

export default smartStorage;