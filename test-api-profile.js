import dotenv from 'dotenv';
import fetch from 'node-fetch';

// 加载环境变量
dotenv.config();

const API_BASE_URL = 'http://localhost:3003';

async function testUserProfile() {
  try {
    console.log('🔍 测试用户登录和获取个人资料...');
    
    // 1. 先登录获取token
    console.log('\n1. 登录用户...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'zhaodan@ke.com',
        password: 'admin123456'
      })
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ 登录失败:', loginResponse.status, errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ 登录成功');
    console.log('完整登录响应:', JSON.stringify(loginData, null, 2));
    
    // 检查不同可能的token字段名
    const token = loginData.token || loginData.accessToken || loginData.access_token || loginData.data?.token;
    console.log('Token:', token ? '已获取' : '未获取');
    
    if (!token) {
      console.error('❌ 未获取到token');
      return;
    }
    
    // 2. 使用token获取用户资料
    console.log('\n2. 获取用户资料...');
    const profileResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('❌ 获取用户资料失败:', profileResponse.status, errorText);
      return;
    }
    
    const profileData = await profileResponse.json();
    console.log('✅ 获取用户资料成功');
    
    // 3. 分析返回的数据
    const userData = profileData.data || profileData;
    console.log('\n📊 用户资料分析:');
    console.log('用户ID:', userData.id);
    console.log('邮箱:', userData.email);
    console.log('姓名:', userData.name);
    
    console.log('\n👥 角色信息:');
    if (userData.roles && Array.isArray(userData.roles)) {
      console.log('角色数量:', userData.roles.length);
      userData.roles.forEach(role => {
        console.log(`  - ${role}`);
      });
      
      // 检查是否包含admin角色
      const isAdmin = userData.roles.includes('admin');
      console.log('\n🔍 管理员角色检查:', isAdmin ? '✅ 是管理员' : '❌ 不是管理员');
    } else {
      console.log('❌ 角色信息缺失或格式错误:', userData.roles);
    }
    
    console.log('\n🔑 权限信息:');
    if (userData.permissions && Array.isArray(userData.permissions)) {
      console.log('权限数量:', userData.permissions.length);
      const keyPermissions = ['materials.create', 'questions.generate', 'questions.review', 'users.manage'];
      keyPermissions.forEach(permission => {
        const hasPermission = userData.permissions.includes(permission);
        console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}`);
      });
    } else {
      console.log('❌ 权限信息缺失或格式错误:', userData.permissions);
    }
    
    console.log('\n📋 完整响应数据:');
    console.log(JSON.stringify(profileData, null, 2));
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testUserProfile();