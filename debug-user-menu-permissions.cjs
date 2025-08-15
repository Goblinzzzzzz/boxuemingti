/**
 * 综合调试脚本：检查用户zhaodan@ke.com的权限配置和前端菜单显示状态
 * 功能：
 * 1. 查询数据库中该用户的角色和权限配置
 * 2. 模拟前端权限检查逻辑
 * 3. 验证教材输入、AI生成、试题审核菜单的权限要求
 * 4. 输出详细的诊断报告，找出菜单丢失的原因
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// 加载环境变量
require('dotenv').config();

// 配置
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少Supabase配置：请检查.env文件中的SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const API_BASE = 'http://localhost:3003/api';
const TEST_USER_EMAIL = 'zhaodan@ke.com';
const TEST_USER_PASSWORD = '123456';

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 菜单权限配置（从Layout.tsx中提取）
const MENU_PERMISSIONS = {
  '/material-input': {
    permissions: ['materials.create'],
    roles: ['admin', 'teacher']
  },
  '/ai-generator': {
    permissions: ['questions.generate'],
    roles: ['admin', 'teacher']
  },
  '/question-review': {
    permissions: ['questions.review'],
    roles: ['admin', 'teacher']
  },
  '/admin/users': {
    permissions: ['users.manage'],
    roles: ['admin']
  },
  '/admin/system': {
    permissions: ['system.admin'],
    roles: ['admin']
  }
};

/**
 * 模拟前端权限检查逻辑
 */
function simulatePermissionCheck(userRoles, userPermissions, requiredPermissions, requiredRoles) {
  // 检查角色权限
  const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
  
  // 检查具体权限
  const hasRequiredPermission = requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );
  
  return {
    hasRequiredRole,
    hasRequiredPermission,
    canAccess: hasRequiredRole || hasRequiredPermission
  };
}

/**
 * 主要调试函数
 */
async function debugUserMenuPermissions() {
  console.log('🔍 用户菜单权限调试脚本');
  console.log('=' .repeat(60));
  console.log(`目标用户: ${TEST_USER_EMAIL}`);
  console.log('');
  
  try {
    // 1. 数据库直接查询用户信息
    console.log('📊 1. 数据库直接查询用户信息');
    console.log('-'.repeat(40));
    
    // 查询用户基本信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', TEST_USER_EMAIL)
      .single();
    
    if (userError || !user) {
      console.log('❌ 用户不存在:', userError?.message);
      return;
    }
    
    console.log(`✅ 用户ID: ${user.id}`);
    console.log(`✅ 用户名: ${user.name}`);
    console.log(`✅ 邮箱: ${user.email}`);
    console.log(`✅ 状态: ${user.status}`);
    console.log('');
    
    // 2. 查询用户角色
    console.log('👥 2. 查询用户角色');
    console.log('-'.repeat(40));
    
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          id,
          name,
          description
        )
      `)
      .eq('user_id', user.id);
    
    if (rolesError) {
      console.log('❌ 查询用户角色失败:', rolesError.message);
      return;
    }
    
    const roles = userRoles.map(ur => ur.roles.name);
    console.log(`✅ 用户角色数量: ${roles.length}`);
    roles.forEach(role => {
      console.log(`  - ${role}`);
    });
    console.log('');
    
    // 3. 使用RPC函数获取用户权限
    console.log('🔐 3. 获取用户权限（使用RPC函数）');
    console.log('-'.repeat(40));
    
    const { data: permissions, error: permissionsError } = await supabase
      .rpc('get_user_permissions', { user_uuid: user.id });
    
    if (permissionsError) {
      console.log('❌ 获取用户权限失败:', permissionsError.message);
      return;
    }
    
    console.log(`✅ 用户权限数量: ${permissions.length}`);
    permissions.forEach(permission => {
      console.log(`  - ${permission}`);
    });
    console.log('');
    
    // 4. API接口测试
    console.log('🌐 4. API接口测试');
    console.log('-'.repeat(40));
    
    // 登录获取token
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ 登录失败:', await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    
    if (!token) {
      console.log('❌ 未获取到访问令牌');
      return;
    }
    
    console.log('✅ 登录成功，获取到访问令牌');
    
    // 获取用户信息
    const profileResponse = await fetch(`${API_BASE}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!profileResponse.ok) {
      console.log('❌ 获取用户信息失败:', await profileResponse.text());
      return;
    }
    
    const profileData = await profileResponse.json();
    console.log('✅ API返回的用户信息:');
    console.log('完整响应:', JSON.stringify(profileData, null, 2));
    
    // 从API响应中正确提取角色和权限
    // 根据完整响应，数据在 data 的顶层
    const apiRoles = profileData.data?.roles || [];
    const apiPermissions = profileData.data?.permissions || [];
    
    console.log('调试信息:');
    console.log('profileData.data:', JSON.stringify(profileData.data, null, 2));
    console.log('提取的角色:', apiRoles);
    console.log('提取的权限:', apiPermissions);
    
    console.log(`  - 角色: ${JSON.stringify(apiRoles)}`);
    console.log(`  - 权限: ${JSON.stringify(apiPermissions)}`);
    console.log('');
    
    // 5. 前端权限检查模拟
    console.log('🎯 5. 前端权限检查模拟');
    console.log('-'.repeat(40));
    
    console.log('菜单权限检查结果:');
    Object.entries(MENU_PERMISSIONS).forEach(([path, config]) => {
      const check = simulatePermissionCheck(
        apiRoles,
        apiPermissions,
        config.permissions,
        config.roles
      );
      
      const status = check.canAccess ? '✅' : '❌';
      console.log(`${status} ${path}`);
      console.log(`    需要角色: ${config.roles.join(', ')}`);
      console.log(`    需要权限: ${config.permissions.join(', ')}`);
      console.log(`    角色匹配: ${check.hasRequiredRole ? '✅' : '❌'}`);
      console.log(`    权限匹配: ${check.hasRequiredPermission ? '✅' : '❌'}`);
      console.log(`    最终结果: ${check.canAccess ? '可访问' : '不可访问'}`);
      console.log('');
    });
    
    // 6. 诊断报告
    console.log('📋 6. 诊断报告');
    console.log('-'.repeat(40));
    
    const problematicMenus = Object.entries(MENU_PERMISSIONS)
      .filter(([path, config]) => {
        const check = simulatePermissionCheck(
          apiRoles,
          apiPermissions,
          config.permissions,
          config.roles
        );
        return !check.canAccess;
      });
    
    if (problematicMenus.length === 0) {
      console.log('✅ 所有菜单权限检查通过，菜单应该正常显示');
    } else {
      console.log('❌ 发现问题菜单:');
      problematicMenus.forEach(([path, config]) => {
        console.log(`  - ${path}: 缺少必要的角色或权限`);
      });
    }
    
    // 检查关键权限
    const keyPermissions = ['materials.create', 'questions.generate', 'questions.review'];
    const missingPermissions = keyPermissions.filter(p => !apiPermissions.includes(p));
    
    if (missingPermissions.length > 0) {
      console.log('❌ 缺少关键权限:');
      missingPermissions.forEach(p => {
        console.log(`  - ${p}`);
      });
    } else {
      console.log('✅ 所有关键权限都存在');
    }
    
    // 数据一致性检查
    console.log('');
    console.log('🔄 数据一致性检查:');
    const dbRolesSet = new Set(roles);
    const apiRolesSet = new Set(apiRoles);
    const dbPermissionsSet = new Set(permissions);
    const apiPermissionsSet = new Set(apiPermissions);
    
    const rolesDiff = [...dbRolesSet].filter(r => !apiRolesSet.has(r));
    const permissionsDiff = [...dbPermissionsSet].filter(p => !apiPermissionsSet.has(p));
    
    if (rolesDiff.length === 0 && permissionsDiff.length === 0) {
      console.log('✅ 数据库和API返回的数据一致');
    } else {
      console.log('❌ 数据不一致:');
      if (rolesDiff.length > 0) {
        console.log(`  - 数据库中存在但API未返回的角色: ${rolesDiff.join(', ')}`);
      }
      if (permissionsDiff.length > 0) {
        console.log(`  - 数据库中存在但API未返回的权限: ${permissionsDiff.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error.message);
    console.error(error.stack);
  }
}

// 运行调试
debugUserMenuPermissions();