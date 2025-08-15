#!/usr/bin/env node

/**
 * Vercel环境错误日志检查脚本
 * 用于分析PDF解析失败的具体错误信息
 */

import { errorLogger } from './api/utils/error-logger.ts';
import fs from 'fs';
import path from 'path';

async function checkVercelLogs() {
  console.log('🔍 检查Vercel环境错误日志...');
  console.log('==================================================');
  
  try {
    // 获取最近的错误日志
    const recentLogs = errorLogger.getRecentLogs(20);
    const documentParsingErrors = errorLogger.getLogsByCategory('document_parsing');
    
    console.log(`📊 日志统计:`);
    console.log(`- 总日志数: ${recentLogs.length}`);
    console.log(`- 文档解析错误: ${documentParsingErrors.length}`);
    
    if (documentParsingErrors.length > 0) {
      console.log('\n❌ 文档解析错误详情:');
      documentParsingErrors.slice(-5).forEach((log, index) => {
        console.log(`\n错误 ${index + 1}:`);
        console.log(`- 时间: ${log.timestamp}`);
        console.log(`- 消息: ${log.message}`);
        console.log(`- 文件名: ${log.filename || '未知'}`);
        console.log(`- 文件大小: ${log.fileSize ? `${Math.round(log.fileSize / 1024)}KB` : '未知'}`);
        console.log(`- MIME类型: ${log.mimeType || '未知'}`);
        
        if (log.details && log.details.error) {
          console.log(`- 错误详情: ${log.details.error}`);
        }
        
        if (log.memoryUsage) {
          const memMB = Math.round(log.memoryUsage.heapUsed / 1024 / 1024);
          console.log(`- 内存使用: ${memMB}MB`);
        }
      });
    }
    
    // 生成错误报告
    console.log('\n📋 生成错误报告...');
    const report = errorLogger.generateErrorReport();
    console.log(report);
    
    // 分析常见错误模式
    console.log('\n🔍 错误模式分析:');
    const errorMessages = documentParsingErrors.map(log => log.message);
    const badXRefErrors = errorMessages.filter(msg => msg.includes('bad XRef') || msg.includes('XRef') || msg.includes('cross-reference'));
    const encryptedErrors = errorMessages.filter(msg => msg.includes('encrypted') || msg.includes('password'));
    const formatErrors = errorMessages.filter(msg => msg.includes('Invalid PDF') || msg.includes('PDF header'));
    const memoryErrors = errorMessages.filter(msg => msg.includes('memory') || msg.includes('heap'));
    
    console.log(`- bad XRef entry 错误: ${badXRefErrors.length} 次`);
    console.log(`- 加密文档错误: ${encryptedErrors.length} 次`);
    console.log(`- 格式错误: ${formatErrors.length} 次`);
    console.log(`- 内存错误: ${memoryErrors.length} 次`);
    
    if (badXRefErrors.length > 0) {
      console.log('\n⚠️ 检测到 bad XRef entry 错误，这通常表示:');
      console.log('1. PDF文件的交叉引用表损坏');
      console.log('2. PDF文件结构不完整或被截断');
      console.log('3. PDF文件使用了不标准的格式');
      console.log('4. 文件在传输过程中损坏');
    }
    
    // 检查Vercel环境特定问题
    console.log('\n🌐 Vercel环境检查:');
    console.log(`- 环境: ${process.env.VERCEL ? 'Vercel Serverless' : 'Local'}`);
    console.log(`- Node版本: ${process.version}`);
    console.log(`- 平台: ${process.platform}`);
    console.log(`- 架构: ${process.arch}`);
    
    // 检查pdf-parse库状态
    console.log('\n📚 依赖库检查:');
    try {
      const pdfParse = await import('pdf-parse');
      console.log('✅ pdf-parse库加载成功');
    } catch (error) {
      console.log('❌ pdf-parse库加载失败:', error.message);
    }
    
    // 内存使用情况
    const memUsage = process.memoryUsage();
    console.log('\n🧠 当前内存使用:');
    console.log(`- RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`- Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`- Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`- External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
    
    // 提供修复建议
    console.log('\n💡 修复建议:');
    if (badXRefErrors.length > 0) {
      console.log('针对 bad XRef entry 错误:');
      console.log('1. 增强PDF文件验证逻辑');
      console.log('2. 添加PDF修复尝试机制');
      console.log('3. 提供更详细的用户指导');
      console.log('4. 考虑使用备选PDF解析库');
    }
    
    if (memoryErrors.length > 0) {
      console.log('针对内存问题:');
      console.log('1. 降低文件大小限制');
      console.log('2. 优化内存管理');
      console.log('3. 增加内存监控');
    }
    
    console.log('\n✅ 日志检查完成');
    
  } catch (error) {
    console.error('❌ 日志检查失败:', error);
    
    // 尝试从文件系统读取日志（如果有的话）
    console.log('\n🔍 尝试从文件系统读取日志...');
    const possibleLogPaths = [
      './logs/error.log',
      './vercel-logs.json',
      './.vercel/output/logs/error.log',
      './api/logs/error.log'
    ];
    
    for (const logPath of possibleLogPaths) {
      try {
        if (fs.existsSync(logPath)) {
          console.log(`📄 发现日志文件: ${logPath}`);
          const logContent = fs.readFileSync(logPath, 'utf8');
          console.log('日志内容:');
          console.log(logContent.slice(-2000)); // 显示最后2000字符
        }
      } catch (readError) {
        console.log(`无法读取 ${logPath}: ${readError.message}`);
      }
    }
  }
}

// 运行日志检查
checkVercelLogs().catch(console.error);