/**
 * 测试登录状态验证功能
 * 验证不同状态的用户登录行为
 */
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 初始化Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_BASE = 'http://localhost:3003';

// 测试用户数据
const testUsers = [
  {
    email: 'active.user@test.com',
    password: 'test123456',
    name: 'Active User',
    status: 'active'
  },
  {
    email: 'suspended.user@test.com',
    password: 'test123456',
    name: 'Suspended User',
    status: 'suspended'
  },
  {
    email: 'pending.user@test.com',
    password: 'test123456',
    name: 'Pending User',
    status: 'pending'
  },
  {
    email: 'inactive.user@test.com',
    password: 'test123456',
    name: 'Inactive User',
    status: 'inactive'
  }
];

async function createTestUsers() {
  console.log('\n=== 创建测试用户 ===');
  
  for (const user of testUsers) {
    try {
      // 检查用户是否已存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (existingUser) {
        console.log(`用户 ${user.email} 已存在，跳过创建`);
        continue;
      }
      
      // 加密密码
      const passwordHash = await bcrypt.hash(user.password, 12);
      
      // 创建用户
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email: user.email,
          password_hash: passwordHash,
          name: user.name,
          status: user.status
        })
        .select('id, email, name, status')
        .single();
      
      if (error) {
        console.error(`创建用户 ${user.email} 失败:`, error);
      } else {
        console.log(`✅ 创建用户成功: ${newUser.email} (${newUser.status})`);
      }
    } catch (error) {
      console.error(`创建用户 ${user.email} 异常:`, error.message);
    }
  }
}

async function testLogin(email, password, expectedResult) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    
    console.log(`\n测试登录: ${email}`);
    console.log(`状态码: ${response.status}`);
    console.log(`响应:`, result);
    
    if (expectedResult === 'success') {
      if (response.status === 200 && result.success) {
        console.log('✅ 测试通过: active用户成功登录');
        return true;
      } else {
        console.log('❌ 测试失败: active用户应该能够登录');
        return false;
      }
    } else {
      if (response.status === 403 && !result.success) {
        console.log(`✅ 测试通过: ${expectedResult}用户被正确拒绝登录`);
        console.log(`错误信息: ${result.message}`);
        return true;
      } else {
        console.log(`❌ 测试失败: ${expectedResult}用户应该被拒绝登录`);
        return false;
      }
    }
  } catch (error) {
    console.error(`登录测试异常 (${email}):`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== 开始测试登录状态验证功能 ===');
  
  // 创建测试用户
  await createTestUsers();
  
  console.log('\n=== 开始登录测试 ===');
  
  const testCases = [
    {
      email: 'active.user@test.com',
      password: 'test123456',
      expected: 'success',
      description: 'Active用户应该能够正常登录'
    },
    {
      email: 'suspended.user@test.com',
      password: 'test123456',
      expected: 'suspended',
      description: 'Suspended用户应该被拒绝登录'
    },
    {
      email: 'pending.user@test.com',
      password: 'test123456',
      expected: 'pending',
      description: 'Pending用户应该被拒绝登录'
    },
    {
      email: 'inactive.user@test.com',
      password: 'test123456',
      expected: 'inactive',
      description: 'Inactive用户应该被拒绝登录'
    }
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.description} ---`);
    const result = await testLogin(testCase.email, testCase.password, testCase.expected);
    if (result) {
      passedTests++;
    }
    
    // 等待一下避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=== 测试结果汇总 ===');
  console.log(`通过测试: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！登录状态验证功能正常工作');
  } else {
    console.log('⚠️  部分测试失败，请检查登录状态验证逻辑');
  }
}

async function cleanup() {
  console.log('\n=== 清理测试数据 ===');
  
  for (const user of testUsers) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('email', user.email);
      
      if (error) {
        console.error(`删除用户 ${user.email} 失败:`, error);
      } else {
        console.log(`✅ 删除用户: ${user.email}`);
      }
    } catch (error) {
      console.error(`删除用户 ${user.email} 异常:`, error.message);
    }
  }
}

// 运行测试
runTests()
  .then(() => {
    console.log('\n测试完成');
    // 可选：清理测试数据
    // return cleanup();
  })
  .catch(error => {
    console.error('测试过程中发生错误:', error);
  })
  .finally(() => {
    process.exit(0);
  });