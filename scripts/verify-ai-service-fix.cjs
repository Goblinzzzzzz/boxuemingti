#!/usr/bin/env node

/**
 * AI服务修复验证脚本
 * 用于验证Vercel生产环境中AI服务配置是否正常
 */

const https = require('https');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 获取最新的Vercel部署URL
function getLatestDeploymentUrl() {
  try {
    const output = execSync('vercel ls | head -10', { encoding: 'utf8' });
    const lines = output.split('\n');
    
    // 查找第一个Ready状态的部署URL
    for (const line of lines) {
      if (line.includes('Ready') && line.includes('https://')) {
        const match = line.match(/https:\/\/[^\s]+/);
        if (match) {
          return match[0];
        }
      }
    }
    
    throw new Error('未找到Ready状态的部署');
  } catch (error) {
    log(`❌ 获取部署URL失败: ${error.message}`, 'red');
    return null;
  }
}

// 发送HTTP请求
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, error: 'JSON解析失败' });
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// 验证AI服务状态
async function verifyAIService(baseUrl) {
  log('\n🔍 验证AI服务状态...', 'blue');
  
  try {
    const response = await makeRequest(`${baseUrl}/api/generation/ai-status`);
    
    if (response.status === 200 && response.data.success) {
      const { available, provider, model, hasApiKey, message } = response.data.data;
      
      log('✅ AI服务状态检查通过', 'green');
      log(`   - 服务可用: ${available ? '是' : '否'}`, available ? 'green' : 'red');
      log(`   - 服务商: ${provider}`, 'blue');
      log(`   - 模型: ${model}`, 'blue');
      log(`   - API密钥: ${hasApiKey ? '已配置' : '未配置'}`, hasApiKey ? 'green' : 'red');
      log(`   - 状态消息: ${message}`, available ? 'green' : 'yellow');
      
      return available && hasApiKey;
    } else {
      log('❌ AI服务状态检查失败', 'red');
      log(`   状态码: ${response.status}`, 'red');
      log(`   响应: ${JSON.stringify(response.data, null, 2)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ AI服务状态检查出错: ${error.message}`, 'red');
    return false;
  }
}

// 验证环境变量配置
async function verifyEnvironmentVariables(baseUrl) {
  log('\n🔍 验证环境变量配置...', 'blue');
  
  try {
    const response = await makeRequest(`${baseUrl}/api/env-check`);
    
    if (response.status === 200) {
      log('✅ 环境变量检查接口正常', 'green');
      
      // 检查关键环境变量
      const envData = response.data;
      const requiredVars = ['AI_PROVIDER', 'DMXAPI_API_KEY', 'DMXAPI_MODEL'];
      
      let allConfigured = true;
      for (const varName of requiredVars) {
        if (envData[varName] && envData[varName].defined) {
          const value = envData[varName].preview || envData[varName].value;
          // 检查是否包含换行符
          const hasNewline = value.includes('\\n') || value.includes('\n');
          
          log(`   - ${varName}: ${envData[varName].defined ? '已配置' : '未配置'}${hasNewline ? ' (包含换行符)' : ''}`, 
              envData[varName].defined && !hasNewline ? 'green' : 'red');
          
          if (!envData[varName].defined || hasNewline) {
            allConfigured = false;
          }
        } else {
          log(`   - ${varName}: 未配置`, 'red');
          allConfigured = false;
        }
      }
      
      return allConfigured;
    } else {
      log('❌ 环境变量检查失败', 'red');
      log(`   状态码: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 环境变量检查出错: ${error.message}`, 'red');
    return false;
  }
}

// 主验证函数
async function main() {
  log('🚀 开始验证AI服务修复结果', 'bold');
  log('=' .repeat(50), 'blue');
  
  // 获取部署URL
  const deploymentUrl = getLatestDeploymentUrl();
  if (!deploymentUrl) {
    log('❌ 无法获取部署URL，验证失败', 'red');
    process.exit(1);
  }
  
  log(`🌐 使用部署URL: ${deploymentUrl}`, 'blue');
  
  // 验证环境变量
  const envOk = await verifyEnvironmentVariables(deploymentUrl);
  
  // 验证AI服务
  const aiOk = await verifyAIService(deploymentUrl);
  
  // 总结结果
  log('\n📊 验证结果总结', 'bold');
  log('=' .repeat(50), 'blue');
  
  if (envOk && aiOk) {
    log('🎉 所有检查通过！AI服务修复成功', 'green');
    log('\n✅ 修复内容:', 'green');
    log('   - 移除了AI_PROVIDER环境变量中的换行符', 'green');
    log('   - 添加了DMXAPI_MODEL环境变量', 'green');
    log('   - 修复了后端代码中的环境变量处理逻辑', 'green');
    log('   - AI服务现在可以正常工作', 'green');
  } else {
    log('❌ 部分检查失败，需要进一步修复', 'red');
    
    if (!envOk) {
      log('   - 环境变量配置存在问题', 'red');
    }
    
    if (!aiOk) {
      log('   - AI服务仍然不可用', 'red');
    }
  }
  
  log('\n🔗 相关链接:', 'blue');
  log(`   - AI服务状态: ${deploymentUrl}/api/generation/ai-status`, 'blue');
  log(`   - 环境变量检查: ${deploymentUrl}/api/env-check`, 'blue');
  
  process.exit(envOk && aiOk ? 0 : 1);
}

// 运行验证
main().catch((error) => {
  log(`❌ 验证过程出错: ${error.message}`, 'red');
  process.exit(1);
});