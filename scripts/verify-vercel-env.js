#!/usr/bin/env node

/**
 * Vercel环境变量验证脚本
 * 通过调用生产环境的API接口验证环境变量配置
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const config = {
  // 生产环境URL (需要根据实际部署地址修改)
  productionUrl: process.env.VERCEL_URL || 'traemingtivtvj.vercel.app',
  // 本地开发环境
  localUrl: 'localhost:3003',
  // 超时时间
  timeout: 10000
};

// HTTP请求函数
function makeRequest(url, path, useHttps = true) {
  return new Promise((resolve, reject) => {
    const protocol = useHttps ? https : http;
    const fullUrl = `${useHttps ? 'https' : 'http'}://${url}${path}`;
    
    console.log(`🔍 检查: ${fullUrl}`);
    
    const req = protocol.get(fullUrl, {
      timeout: config.timeout,
      headers: {
        'User-Agent': 'Vercel-Env-Checker/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData,
            url: fullUrl
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            error: 'Invalid JSON response',
            url: fullUrl
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject({
        error: error.message,
        url: fullUrl
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        url: fullUrl
      });
    });
  });
}

// 检查环境变量状态
async function checkEnvironmentVariables(baseUrl, useHttps = true) {
  try {
    const response = await makeRequest(baseUrl, '/api/env-check', useHttps);
    
    if (response.statusCode === 200 && response.data.success) {
      return {
        success: true,
        environment: response.data.environment,
        url: response.url
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Unknown error',
        statusCode: response.statusCode,
        url: response.url
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.error || error.message,
      url: error.url
    };
  }
}

// 检查AI服务状态
async function checkAIServiceStatus(baseUrl, useHttps = true) {
  try {
    const response = await makeRequest(baseUrl, '/api/generation/ai-status', useHttps);
    
    if (response.statusCode === 200 && response.data.success) {
      return {
        success: true,
        aiStatus: response.data.data,
        url: response.url
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Unknown error',
        statusCode: response.statusCode,
        url: response.url
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.error || error.message,
      url: error.url
    };
  }
}

// 生成验证报告
function generateValidationReport(localResult, productionResult) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      local: localResult.success ? '✅ 正常' : '❌ 异常',
      production: productionResult.success ? '✅ 正常' : '❌ 异常'
    },
    details: {
      local: localResult,
      production: productionResult
    },
    recommendations: []
  };
  
  // 生成建议
  if (!localResult.success) {
    report.recommendations.push('本地环境配置有问题，请检查.env文件和后端服务');
  }
  
  if (!productionResult.success) {
    report.recommendations.push('生产环境配置有问题，请检查Vercel环境变量设置');
    report.recommendations.push('运行 node scripts/setup-vercel-env.js 获取配置命令');
    report.recommendations.push('确保已重新部署到Vercel');
  }
  
  // 比较AI服务配置
  if (localResult.success && productionResult.success) {
    const localAI = localResult.environment?.health?.aiServiceStatus;
    const prodAI = productionResult.environment?.health?.aiServiceStatus;
    
    if (localAI?.configured && !prodAI?.configured) {
      report.recommendations.push('生产环境AI服务配置不完整，本地配置正常');
    } else if (!localAI?.configured && !prodAI?.configured) {
      report.recommendations.push('本地和生产环境都缺少AI服务配置');
    }
  }
  
  return report;
}

// 显示环境状态
function displayEnvironmentStatus(envData, title) {
  console.log(`\n📊 ${title}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!envData) {
    console.log('❌ 无法获取环境数据');
    return;
  }
  
  const health = envData.health;
  const platform = envData.platform;
  
  console.log(`🏥 健康状态: ${health.status} (${health.score}%)`);
  console.log(`🔧 平台信息: ${platform.isVercel ? 'Vercel' : 'Local'} | ${platform.vercelEnv}`);
  console.log(`📝 消息: ${health.message}`);
  
  if (health.aiServiceStatus) {
    const ai = health.aiServiceStatus;
    console.log(`🤖 AI服务: ${ai.provider} | ${ai.configured ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   ${ai.message}`);
  }
  
  if (envData.summary.issues.length > 0) {
    console.log('\n⚠️  发现问题:');
    envData.summary.issues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  }
}

// 主函数
async function main() {
  console.log('🔍 Vercel环境变量验证工具\n');
  
  try {
    // 检查本地环境
    console.log('1️⃣ 检查本地环境...');
    const localResult = await checkEnvironmentVariables(config.localUrl, false);
    
    // 检查生产环境
    console.log('\n2️⃣ 检查生产环境...');
    const productionResult = await checkEnvironmentVariables(config.productionUrl, true);
    
    // 显示结果
    if (localResult.success) {
      displayEnvironmentStatus(localResult.environment, '本地环境状态');
    } else {
      console.log('\n❌ 本地环境检查失败:');
      console.log(`   错误: ${localResult.error}`);
      console.log(`   URL: ${localResult.url}`);
    }
    
    if (productionResult.success) {
      displayEnvironmentStatus(productionResult.environment, '生产环境状态');
    } else {
      console.log('\n❌ 生产环境检查失败:');
      console.log(`   错误: ${productionResult.error}`);
      console.log(`   URL: ${productionResult.url}`);
    }
    
    // 生成验证报告
    const report = generateValidationReport(localResult, productionResult);
    
    console.log('\n📋 验证总结:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`本地环境: ${report.summary.local}`);
    console.log(`生产环境: ${report.summary.production}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 建议:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    } else {
      console.log('\n✅ 所有环境配置正常！');
    }
    
    // 保存报告
    const reportPath = path.join(__dirname, '../vercel-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    
    if (productionResult.success) {
      console.log('\n🎉 生产环境配置正常！AI服务应该可以正常工作。');
    } else {
      console.log('\n⚠️  生产环境需要修复。请按照上述建议操作。');
    }
    
    // 检查AI服务状态
    console.log('\n3️⃣ 检查AI服务状态...');
    const localAI = await checkAIServiceStatus(config.localUrl, false);
    const prodAI = await checkAIServiceStatus(config.productionUrl, true);
    
    console.log('\n🤖 AI服务状态:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (localAI.success) {
      const ai = localAI.aiStatus;
      console.log(`本地: ${ai.available ? '✅ 可用' : '❌ 不可用'} | ${ai.provider} | ${ai.model}`);
    } else {
      console.log(`本地: ❌ 检查失败 - ${localAI.error}`);
    }
    
    if (prodAI.success) {
      const ai = prodAI.aiStatus;
      console.log(`生产: ${ai.available ? '✅ 可用' : '❌ 不可用'} | ${ai.provider} | ${ai.model}`);
    } else {
      console.log(`生产: ❌ 检查失败 - ${prodAI.error}`);
    }
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkEnvironmentVariables, checkAIServiceStatus, generateValidationReport };