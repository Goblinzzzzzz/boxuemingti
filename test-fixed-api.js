// 测试修复后的API权限返回
// 验证zhaodan@ke.com用户登录后能否正确获取角色和权限

const API_BASE = 'http://localhost:3003/api';

async function testFixedAPI() {
  try {
    console.log('🧪 测试修复后的API权限返回...');
    console.log('='.repeat(50));
    
    // 1. 用户登录
    console.log('1. 用户登录...');
    const loginResponse = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'zhaodan@ke.com',
        password: '123456'
      })
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ 登录失败:', loginResponse.status, errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ 登录成功');
    console.log('登录响应数据:', JSON.stringify(loginData, null, 2));
    
    const token = loginData.token || loginData.access_token || loginData.accessToken;
    if (!token) {
      console.log('❌ 未获取到访问令牌');
      console.log('可用字段:', Object.keys(loginData));
      return;
    }
    
    // 2. 获取用户信息
    console.log('\n2. 获取用户信息...');
    const profileResponse = await fetch(`${API_BASE}/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('❌ 获取用户信息失败:', profileResponse.status, errorText);
      return;
    }
    
    const profileData = await profileResponse.json();
    console.log('✅ 获取用户信息成功');
    
    // 3. 分析返回的数据
    const userData = profileData.data;
    console.log('\n📊 用户信息分析:');
    console.log('用户ID:', userData.id);
    console.log('邮箱:', userData.email);
    console.log('姓名:', userData.name);
    
    console.log('\n👥 角色信息:');
    if (userData.roles && Array.isArray(userData.roles)) {
      console.log('角色数量:', userData.roles.length);
      userData.roles.forEach(role => {
        console.log(`  - ${role}`);
      });
    } else {
      console.log('❌ 角色信息缺失或格式错误');
    }
    
    console.log('\n🔐 权限信息:');
    if (userData.permissions && Array.isArray(userData.permissions)) {
      console.log('权限数量:', userData.permissions.length);
      userData.permissions.forEach(permission => {
        console.log(`  - ${permission}`);
      });
    } else {
      console.log('❌ 权限信息缺失或格式错误');
    }
    
    // 4. 验证关键权限
    console.log('\n🎯 关键权限验证:');
    const requiredPermissions = [
      'materials.create',
      'questions.generate', 
      'questions.review'
    ];
    
    const hasAllPermissions = requiredPermissions.every(perm => 
      userData.permissions && userData.permissions.includes(perm)
    );
    
    requiredPermissions.forEach(perm => {
      const hasPermission = userData.permissions && userData.permissions.includes(perm);
      console.log(`  ${perm}: ${hasPermission ? '✅' : '❌'}`);
    });
    
    console.log('\n📋 总结:');
    if (hasAllPermissions) {
      console.log('✅ 所有关键权限都已正确返回，菜单应该正常显示');
    } else {
      console.log('❌ 部分关键权限缺失，菜单可能仍然不显示');
    }
    
    // 5. 验证admin角色
    const hasAdminRole = userData.roles && userData.roles.includes('admin');
    console.log(`管理员角色: ${hasAdminRole ? '✅' : '❌'}`);
    
    console.log('\n='.repeat(50));
    console.log('🧪 API测试完成');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testFixedAPI();