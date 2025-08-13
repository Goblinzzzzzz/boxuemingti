/**
 * Vercel 函数优化配置
 * 解决冷启动、依赖加载和性能问题
 */

// 预加载关键依赖，减少冷启动时间
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// 全局变量缓存，避免重复初始化
let cachedApp: express.Application | null = null;
let cachedSupabase: any = null;
let isInitialized = false;

/**
 * 初始化应用缓存
 */
export function initializeCache() {
  if (isInitialized) {
    return { app: cachedApp, supabase: cachedSupabase };
  }

  console.log('🚀 初始化 Vercel 函数缓存...');
  const startTime = Date.now();

  try {
    // 预初始化 Supabase 客户端
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      cachedSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      console.log('✅ Supabase 客户端预初始化完成');
    }

    // 预热 bcrypt（计算密集型操作）
    bcrypt.genSalt(1); // 预热 bcrypt
    console.log('✅ bcrypt 预热完成');

    // 预热 JWT
    if (process.env.JWT_SECRET) {
      jwt.sign({ test: true }, process.env.JWT_SECRET, { expiresIn: '1s' });
      console.log('✅ JWT 预热完成');
    }

    isInitialized = true;
    const duration = Date.now() - startTime;
    console.log(`🎯 Vercel 函数缓存初始化完成，耗时: ${duration}ms`);

    return { app: cachedApp, supabase: cachedSupabase };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Vercel 函数缓存初始化失败 (${duration}ms):`, error);
    throw error;
  }
}

/**
 * 获取缓存的 Supabase 客户端
 */
export function getCachedSupabase() {
  if (!cachedSupabase) {
    initializeCache();
  }
  return cachedSupabase;
}

/**
 * 检查函数是否为冷启动
 */
export function isColdStart(): boolean {
  return !isInitialized;
}

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  private startTime: number;
  private checkpoints: { [key: string]: number } = {};

  constructor(private operationName: string) {
    this.startTime = Date.now();
    console.log(`⏱️ [${operationName}] 性能监控开始`);
  }

  checkpoint(name: string) {
    const now = Date.now();
    this.checkpoints[name] = now - this.startTime;
    console.log(`📊 [${this.operationName}] ${name}: ${this.checkpoints[name]}ms`);
  }

  finish() {
    const totalTime = Date.now() - this.startTime;
    console.log(`🏁 [${this.operationName}] 总耗时: ${totalTime}ms`);
    console.log(`📈 [${this.operationName}] 检查点详情:`, this.checkpoints);
    return totalTime;
  }
}

/**
 * Vercel 环境检测
 */
export function getVercelEnvironmentInfo() {
  return {
    isVercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  };
}

/**
 * 内存使用监控
 */
export function logMemoryUsage(context: string) {
  const usage = process.memoryUsage();
  console.log(`🧠 [${context}] 内存使用情况:`, {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
}

/**
 * 错误处理增强
 */
export function enhancedErrorHandler(error: any, context: string) {
  const errorInfo = {
    message: error instanceof Error ? error.message : '未知错误',
    stack: error instanceof Error ? error.stack : 'No stack trace',
    context,
    timestamp: new Date().toISOString(),
    environment: getVercelEnvironmentInfo(),
    memoryUsage: process.memoryUsage()
  };

  console.error(`💥 [${context}] 增强错误处理:`, errorInfo);
  return errorInfo;
}

// 在模块加载时预初始化
if (process.env.VERCEL) {
  // 只在 Vercel 环境中预初始化
  setTimeout(() => {
    try {
      initializeCache();
    } catch (error) {
      console.error('预初始化失败:', error);
    }
  }, 0);
}