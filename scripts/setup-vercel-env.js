#!/usr/bin/env node

/**
 * Vercel环境变量配置脚本
 * 用于快速设置Vercel项目的所有必要环境变量
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取本地.env文件
function loadLocalEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env文件不存在，请先创建.env文件');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      envVars[key] = value;
    }
  });
  
  return envVars;
}

// 生成Vercel CLI命令
function generateVercelCommands(envVars) {
  const requiredVars = [
    'AI_PROVIDER',
    'DMXAPI_API_KEY',
    'DMXAPI_MODEL',
    'DOUBAO_API_KEY',
    'DOUBAO_MODEL',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_MODEL',
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ];
  
  const commands = [];
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    if (value && value.trim()) {
      // 为不同环境生成命令
      commands.push(`vercel env add ${varName} production`);
      commands.push(`vercel env add ${varName} preview`);
      commands.push(`vercel env add ${varName} development`);
    } else {
      missingVars.push(varName);
    }
  });
  
  return { commands, missingVars };
}

// 生成环境变量状态报告
function generateReport(envVars) {
  const report = {
    timestamp: new Date().toISOString(),
    aiService: {
      provider: envVars.AI_PROVIDER || 'not set',
      configured: false,
      apiKey: 'not set'
    },
    supabase: {
      url: envVars.SUPABASE_URL ? '✅ configured' : '❌ missing',
      anonKey: envVars.SUPABASE_ANON_KEY ? '✅ configured' : '❌ missing',
      serviceKey: envVars.SUPABASE_SERVICE_ROLE_KEY ? '✅ configured' : '❌ missing'
    },
    security: {
      jwtSecret: envVars.JWT_SECRET ? '✅ configured' : '❌ missing'
    }
  };
  
  // 检查AI服务配置
  const provider = envVars.AI_PROVIDER;
  if (provider) {
    const keyMap = {
      'dmxapi': 'DMXAPI_API_KEY',
      'doubao': 'DOUBAO_API_KEY',
      'deepseek': 'DEEPSEEK_API_KEY',
      'openai': 'OPENAI_API_KEY'
    };
    
    const requiredKey = keyMap[provider];
    if (requiredKey && envVars[requiredKey]) {
      report.aiService.configured = true;
      report.aiService.apiKey = '✅ configured';
    } else {
      report.aiService.apiKey = `❌ missing ${requiredKey}`;
    }
  }
  
  return report;
}

// 主函数
function main() {
  console.log('🚀 Vercel环境变量配置助手\n');
  
  try {
    // 加载本地环境变量
    const envVars = loadLocalEnv();
    console.log('✅ 成功读取本地.env文件\n');
    
    // 生成报告
    const report = generateReport(envVars);
    console.log('📊 环境变量状态报告:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🤖 AI服务: ${report.aiService.provider}`);
    console.log(`   API密钥: ${report.aiService.apiKey}`);
    console.log(`   状态: ${report.aiService.configured ? '✅ 已配置' : '❌ 未配置'}`);
    console.log('');
    console.log('🗄️  Supabase:');
    console.log(`   URL: ${report.supabase.url}`);
    console.log(`   匿名密钥: ${report.supabase.anonKey}`);
    console.log(`   服务密钥: ${report.supabase.serviceKey}`);
    console.log('');
    console.log(`🔐 JWT密钥: ${report.security.jwtSecret}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 生成Vercel命令
    const { commands, missingVars } = generateVercelCommands(envVars);
    
    if (missingVars.length > 0) {
      console.log('⚠️  缺少以下环境变量:');
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
      console.log('');
    }
    
    if (commands.length > 0) {
      console.log('📝 Vercel CLI命令 (复制并执行):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // 按环境分组显示命令
      const envTypes = ['production', 'preview', 'development'];
      envTypes.forEach(envType => {
        const envCommands = commands.filter(cmd => cmd.includes(envType));
        if (envCommands.length > 0) {
          console.log(`\n# ${envType.toUpperCase()} 环境:`);
          envCommands.forEach(cmd => {
            console.log(cmd);
          });
        }
      });
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n💡 使用说明:');
      console.log('1. 确保已安装Vercel CLI: npm i -g vercel');
      console.log('2. 登录Vercel: vercel login');
      console.log('3. 链接项目: vercel link');
      console.log('4. 执行上述命令设置环境变量');
      console.log('5. 重新部署: vercel --prod');
    }
    
    // 保存报告到文件
    const reportPath = path.join(__dirname, '../vercel-env-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      report,
      commands,
      missingVars,
      generatedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { loadLocalEnv, generateVercelCommands, generateReport };