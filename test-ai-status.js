#!/usr/bin/env node

/**
 * 测试AI服务状态接口
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3003';

// 测试用户登录凭据
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123456'
};

// 测试用户注册数据
const REGISTER_USER = {
  email: 'test@example.com',
  password: 'test123456',
  name: '测试用户',
  role: 'teacher'
};

async function testLogin() {
  try {
    console.log('🔐 正在登录测试用户...');
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ 登录成功');
      console.log('   响应数据:', JSON.stringify(data, null, 2));
      
      // 尝试不同的数据结构
      const user = data.data?.user || data.user;
      const token = data.data?.access_token || data.access_token || data.token;
      
      if (user) {
        console.log(`   用户: ${user.email}`);
        console.log(`   角色: ${user.role}`);
      }
      
      if (token) {
        return token;
      } else {
        console.log('❌ 无法获取access_token');
        return null;
      }
    } else {
      console.log('❌ 登录失败:', data.error || data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
    return null;
  }
}

async function testAIStatus(token) {
  try {
    console.log('\n🤖 正在检查AI服务状态...');
    
    const response = await fetch(`${BASE_URL}/api/generation/ai-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log(`   响应状态: ${response.status}`);
    console.log(`   响应数据:`, JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ AI状态接口正常');
      const aiData = data.data;
      console.log(`   AI服务可用: ${aiData.available ? '是' : '否'}`);
      console.log(`   服务提供商: ${aiData.provider || '未知'}`);
      console.log(`   模型: ${aiData.model || '未知'}`);
      console.log(`   API密钥: ${aiData.hasApiKey ? '已配置' : '未配置'}`);
      console.log(`   状态消息: ${aiData.message || '无'}`);
      return true;
    } else {
      console.log('❌ AI状态接口异常:', data.error || data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ AI状态请求失败:', error.message);
    return false;
  }
}

async function testAIGeneration(token) {
  try {
    console.log('\n🧪 正在测试AI生成功能...');
    
    const testData = {
      content: '人力资源管理是企业管理的重要组成部分',
      questionType: '单选题',
      difficulty: '易'
    };
    
    const response = await fetch(`${BASE_URL}/api/generation/test-generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    
    console.log(`   响应状态: ${response.status}`);
    
    if (response.ok && data.success) {
      console.log('✅ AI生成功能正常');
      console.log(`   生成的试题:`);
      console.log(`     题目: ${data.data.stem}`);
      console.log(`     选项: ${JSON.stringify(data.data.options)}`);
      console.log(`     答案: ${data.data.correct_answer}`);
      return true;
    } else {
      console.log('❌ AI生成功能异常:', data.error || data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ AI生成请求失败:', error.message);
    return false;
  }
}

async function testRegister() {
  try {
    console.log('📝 正在注册测试用户...');
    
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(REGISTER_USER)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ 注册成功');
      return true;
    } else {
      console.log('⚠️  注册失败或用户已存在:', data.error || data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 注册请求失败:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始AI服务状态检测');
  console.log('=' .repeat(50));
  
  // 0. 尝试注册测试用户（如果不存在）
  await testRegister();
  
  // 1. 测试登录
  const token = await testLogin();
  if (!token) {
    console.log('\n❌ 无法获取认证token，测试终止');
    process.exit(1);
  }
  
  // 2. 测试AI状态接口
  const statusOk = await testAIStatus(token);
  
  // 3. 测试AI生成功能
  const generationOk = await testAIGeneration(token);
  
  // 4. 总结
  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试结果总结');
  console.log('=' .repeat(50));
  console.log(`登录功能: ${token ? '✅ 正常' : '❌ 异常'}`);
  console.log(`AI状态接口: ${statusOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`AI生成功能: ${generationOk ? '✅ 正常' : '❌ 异常'}`);
  
  if (statusOk && generationOk) {
    console.log('\n🎉 AI服务运行正常！');
  } else {
    console.log('\n⚠️  AI服务存在问题，需要进一步排查');
  }
}

main().catch(console.error);