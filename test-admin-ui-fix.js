/**
 * 测试管理员UI修复效果的脚本
 * 验证管理菜单和个人中心角色显示是否正确
 */
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// 加载环境变量
dotenv.config();

const API_BASE_URL = 'http://localhost:3003';
const FRONTEND_URL = 'http://localhost:5173';

async function testAdminUIFix() {
  try {
    console.log('🔧 测试管理员UI修复效果...');
    
    // 1. 测试后端API是否正常返回用户数据
    console.log('\n1. 测试后端API...');
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
      console.error('❌ 登录失败:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('登录响应数据:', JSON.stringify(loginData, null, 2));
    
    const accessToken = loginData.data?.access_token || loginData.access_token || loginData.token;
    if (!accessToken) {
      console.error('❌ 无法从响应中获取access_token');
      return;
    }
    console.log('✅ 登录成功，获取到access_token');
    
    // 2. 获取用户资料
    const profileResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!profileResponse.ok) {
      console.error('❌ 获取用户资料失败:', profileResponse.status);
      return;
    }
    
    const profileData = await profileResponse.json();
    const user = profileData.data || profileData;
    console.log('✅ 获取用户资料成功');
    
    // 3. 分析用户数据
    console.log('\n📊 用户数据分析:');
    console.log('用户ID:', user.id);
    console.log('邮箱:', user.email);
    console.log('姓名:', user.name);
    console.log('角色:', user.roles);
    console.log('权限数量:', user.permissions?.length || 0);
    
    // 4. 检查角色配置
    console.log('\n👥 角色检查:');
    const hasAdminRole = user.roles?.includes('admin');
    const hasUserRole = user.roles?.includes('user');
    console.log('- 拥有admin角色:', hasAdminRole ? '✅' : '❌');
    console.log('- 拥有user角色:', hasUserRole ? '✅' : '❌');
    
    // 5. 检查关键权限
    console.log('\n🔑 关键权限检查:');
    const keyPermissions = [
      'users.manage',
      'system.admin',
      'materials.create',
      'questions.generate',
      'questions.review'
    ];
    
    keyPermissions.forEach(permission => {
      const hasPermission = user.permissions?.includes(permission);
      console.log(`- ${permission}: ${hasPermission ? '✅' : '❌'}`);
    });
    
    // 6. 模拟前端权限检查
    console.log('\n🎯 前端权限检查模拟:');
    
    // 模拟Layout组件的菜单权限检查
    const menuItems = [
      { name: '工作台', href: '/', requiresAuth: true },
      { name: '教材输入', href: '/material-input', permissions: ['materials.create'] },
      { name: 'AI生成工作台', href: '/ai-generator', permissions: ['questions.generate'] },
      { name: '试题审核', href: '/question-review', roles: ['reviewer', 'admin'] },
      { name: '题库管理', href: '/question-bank', requiresAuth: true },
      { name: '用户管理', href: '/admin/users', roles: ['admin'] },
      { name: '系统管理', href: '/admin/system', roles: ['admin'] }
    ];
    
    console.log('菜单项可见性检查:');
    menuItems.forEach(item => {
      let canAccess = true;
      
      if (item.roles) {
        canAccess = item.roles.some(role => user.roles?.includes(role));
      } else if (item.permissions) {
        canAccess = item.permissions.some(permission => user.permissions?.includes(permission));
      }
      
      console.log(`- ${item.name}: ${canAccess ? '✅ 可见' : '❌ 隐藏'}`);
    });
    
    // 7. 模拟个人中心角色显示
    console.log('\n👤 个人中心角色显示模拟:');
    if (user.roles && user.roles.length > 0) {
      console.log('角色标签显示:');
      user.roles.forEach(role => {
        const displayName = role === 'admin' ? '管理员' : 
                           role === 'reviewer' ? '审核员' : 
                           role === 'user' ? '普通用户' : role;
        const colorClass = role === 'admin' ? 'bg-red-100 text-red-800' :
                          role === 'reviewer' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800';
        console.log(`- ${displayName} (${colorClass})`);
      });
    } else {
      console.log('- 显示: 普通用户 (默认)');
    }
    
    // 8. 总结修复效果
    console.log('\n📋 修复效果总结:');
    const adminMenuVisible = user.roles?.includes('admin');
    const allRolesDisplayed = user.roles && user.roles.length > 1;
    
    console.log(`✅ 管理菜单应该${adminMenuVisible ? '可见' : '隐藏'}`);
    console.log(`✅ 个人中心应该显示${allRolesDisplayed ? '多个角色标签' : '单个角色'}`);
    
    if (adminMenuVisible && allRolesDisplayed) {
      console.log('\n🎉 修复成功！用户应该能看到:');
      console.log('- 导航菜单中的"用户管理"和"系统管理"选项');
      console.log('- 个人中心中的"管理员"和"普通用户"角色标签');
    } else {
      console.log('\n⚠️  可能仍有问题需要进一步检查');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testAdminUIFix();