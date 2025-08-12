/**
 * 测试前端认证流程
 * 模拟用户登录后前端获取用户信息的完整流程
 */
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3003/api';
const TEST_USER = {
  email: 'zhaodan@ke.com',
  password: 'admin123456'
};

/**
 * 模拟前端登录流程
 */
async function testFrontendAuthFlow() {
  console.log('=== 测试前端认证流程 ===');
  
  try {
    // 1. 模拟登录请求
    console.log('\n1. 执行登录请求...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const loginData = await loginResponse.json();
    console.log('登录响应:', {
      success: loginData.success,
      hasAccessToken: !!loginData.access_token,
      hasRefreshToken: !!loginData.refresh_token,
      message: loginData.message
    });
    
    if (!loginData.success || !loginData.access_token) {
      console.error('❌ 登录失败:', loginData.message);
      return;
    }
    
    const accessToken = loginData.access_token;
    console.log('✅ 登录成功，获取到access_token');
    
    // 2. 模拟前端存储token（localStorage模拟）
    console.log('\n2. 模拟前端存储token...');
    const mockLocalStorage = {
      access_token: accessToken,
      refresh_token: loginData.refresh_token
    };
    console.log('✅ Token已存储到模拟localStorage');
    
    // 3. 模拟前端初始化时检查token有效性
    console.log('\n3. 检查token有效性...');
    const isValidToken = checkTokenValidity(accessToken);
    console.log('Token有效性检查:', isValidToken ? '✅ 有效' : '❌ 无效');
    
    if (!isValidToken) {
      console.error('❌ Token无效，认证流程失败');
      return;
    }
    
    // 4. 模拟前端获取用户信息
    console.log('\n4. 获取用户信息...');
    const profileResponse = await fetch(`${API_BASE}/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const profileData = await profileResponse.json();
    console.log('用户信息响应:', {
      success: profileData.success,
      hasData: !!profileData.data,
      message: profileData.message
    });
    
    if (!profileData.success || !profileData.data) {
      console.error('❌ 获取用户信息失败:', profileData.message);
      return;
    }
    
    const user = profileData.data;
    console.log('\n=== 用户信息分析 ===');
    console.log('用户基本信息:', {
      id: user.id,
      email: user.email,
      name: user.name,
      organization: user.organization
    });
    
    console.log('\n角色信息:', {
      roles: user.roles,
      hasAdminRole: user.roles?.includes('admin'),
      hasUserRole: user.roles?.includes('user'),
      totalRoles: user.roles?.length || 0
    });
    
    console.log('\n权限信息:', {
      permissions: user.permissions,
      totalPermissions: user.permissions?.length || 0,
      hasKeyPermissions: {
        'materials.create': user.permissions?.includes('materials.create'),
        'questions.generate': user.permissions?.includes('questions.generate'),
        'questions.review': user.permissions?.includes('questions.review'),
        'users.manage': user.permissions?.includes('users.manage'),
        'system.admin': user.permissions?.includes('system.admin')
      }
    });
    
    // 5. 模拟前端权限检查逻辑
    console.log('\n5. 模拟前端权限检查...');
    const authChecks = {
      isAuthenticated: true, // 因为有有效token
      hasAdminRole: user.roles?.includes('admin') || false,
      hasUserRole: user.roles?.includes('user') || false,
      canAccessAdminMenu: user.roles?.includes('admin') || false,
      canManageUsers: user.permissions?.includes('users.manage') || false,
      canReviewQuestions: user.permissions?.includes('questions.review') || false
    };
    
    console.log('前端权限检查结果:', authChecks);
    
    // 6. 分析问题
    console.log('\n=== 问题分析 ===');
    if (authChecks.hasAdminRole) {
      console.log('✅ 用户拥有admin角色');
      if (authChecks.canAccessAdminMenu) {
        console.log('✅ 用户应该能看到管理菜单');
      } else {
        console.log('❌ 用户无法访问管理菜单（权限检查逻辑问题）');
      }
    } else {
      console.log('❌ 用户没有admin角色');
    }
    
    if (!authChecks.hasAdminRole && authChecks.hasUserRole) {
      console.log('⚠️  用户只有user角色，这可能是前端显示的问题根源');
    }
    
    // 7. 提供修复建议
    console.log('\n=== 修复建议 ===');
    if (authChecks.hasAdminRole && authChecks.canAccessAdminMenu) {
      console.log('✅ 后端数据正确，问题可能在前端组件渲染逻辑');
      console.log('建议检查:');
      console.log('- 前端组件是否正确使用authStore中的用户数据');
      console.log('- 菜单组件的权限检查逻辑');
      console.log('- 个人中心页面的角色显示逻辑');
    } else {
      console.log('❌ 发现权限配置问题，需要进一步调试');
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

/**
 * 检查JWT token有效性（模拟前端逻辑）
 */
function checkTokenValidity(token) {
  try {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // JWT应该有3个部分
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // 解析payload检查过期时间
    let base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64Payload.length % 4) {
      base64Payload += '=';
    }
    
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < currentTime) {
      console.log('Token已过期');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token验证失败:', error);
    return false;
  }
}

// 运行测试
testFrontendAuthFlow().catch(console.error);