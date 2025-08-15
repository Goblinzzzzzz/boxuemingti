/**
 * 调试脚本：检查用户zhaodan@ke.com的菜单丢失问题
 * 功能：
 * 1. 查询数据库中该用户的角色和权限配置
 * 2. 模拟前端权限检查逻辑
 * 3. 验证教材输入、AI生成、试题审核菜单的权限要求
 * 4. 输出详细的诊断报告
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量:');
  console.error('SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const TARGET_EMAIL = 'zhaodan@ke.com';

// 菜单权限配置（从Layout.tsx中提取）
const MENU_PERMISSIONS = {
  '教材输入': { permissions: ['materials.create'] },
  'AI生成工作台': { permissions: ['questions.generate'] },
  '试题审核': { permissions: ['questions.review'] },
  '用户管理': { roles: ['admin'] },
  '系统管理': { roles: ['admin'] }
};

// 模拟前端权限检查函数
function hasRole(userRoles, role) {
  return userRoles?.includes(role) || false;
}

function hasPermission(userPermissions, permission) {
  return userPermissions?.includes(permission) || false;
}

function hasAnyRole(userRoles, roles) {
  if (!userRoles) return false;
  return roles.some(role => userRoles.includes(role));
}

function hasAnyPermission(userPermissions, permissions) {
  if (!userPermissions) return false;
  return permissions.some(permission => userPermissions.includes(permission));
}

// 检查菜单权限
function checkMenuAccess(user, menuName, config) {
  let hasAccess = true;
  
  // 检查角色权限
  if (config.roles && config.roles.length > 0) {
    hasAccess = hasAnyRole(user.roles, config.roles);
  }
  
  // 检查操作权限
  if (hasAccess && config.permissions && config.permissions.length > 0) {
    hasAccess = hasAnyPermission(user.permissions, config.permissions);
  }
  
  return hasAccess;
}

async function debugUserMenuIssue() {
  try {
    console.log('=== 用户菜单问题调试报告 ===');
    console.log(`目标用户: ${TARGET_EMAIL}`);
    console.log(`调试时间: ${new Date().toLocaleString()}\n`);

    // 1. 查询用户基本信息
    console.log('📋 1. 查询用户基本信息...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, status, created_at')
      .eq('email', TARGET_EMAIL)
      .single();

    if (userError || !user) {
      console.error('❌ 用户不存在或查询失败:', userError?.message);
      return;
    }

    console.log('✅ 用户基本信息:');
    console.log(`   ID: ${user.id}`);
    console.log(`   邮箱: ${user.email}`);
    console.log(`   姓名: ${user.name}`);
    console.log(`   状态: ${user.status}`);
    console.log(`   创建时间: ${user.created_at}\n`);

    // 2. 查询用户角色
    console.log('👤 2. 查询用户角色...');
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
      console.error('❌ 角色查询失败:', rolesError.message);
      return;
    }

    const roles = userRoles?.map(ur => ur.roles.name) || [];
    console.log('✅ 用户角色:');
    if (roles.length === 0) {
      console.log('   ⚠️  未分配任何角色');
    } else {
      roles.forEach(role => {
        const roleDetail = userRoles.find(ur => ur.roles.name === role)?.roles;
        console.log(`   - ${role} (${roleDetail?.description || '无描述'})`);
      });
    }
    console.log();

    // 3. 查询用户权限（通过角色权限关联）
    console.log('🔐 3. 查询用户权限...');
    const { data: userPermissions, error: permissionsError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles!inner (
          id,
          name,
          role_permissions (
            permissions (
              id,
              name,
              description
            )
          )
        )
      `)
      .eq('user_id', user.id);

    if (permissionsError) {
      console.error('❌ 权限查询失败:', permissionsError.message);
      return;
    }

    // 提取所有权限（去重）
    const permissionSet = new Set();
    userPermissions?.forEach(ur => {
      ur.roles?.role_permissions?.forEach(rp => {
        if (rp.permissions) {
          permissionSet.add(rp.permissions.name);
        }
      });
    });
    const permissions = Array.from(permissionSet);
    console.log('✅ 用户权限:');
    if (permissions.length === 0) {
      console.log('   ⚠️  未分配任何权限');
    } else {
      // 创建权限详情映射
      const permissionDetails = new Map();
      userPermissions?.forEach(ur => {
        ur.roles?.role_permissions?.forEach(rp => {
          if (rp.permissions) {
            permissionDetails.set(rp.permissions.name, rp.permissions.description);
          }
        });
      });
      
      permissions.forEach(permission => {
        const description = permissionDetails.get(permission) || '无描述';
        console.log(`   - ${permission} (${description})`);
      });
    }
    console.log();

    // 4. 构建完整用户对象（模拟前端authStore中的user对象）
    const fullUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: roles,
      permissions: permissions
    };

    // 5. 检查菜单权限
    console.log('🎯 4. 菜单权限检查...');
    console.log('根据前端Layout.tsx中的权限配置检查菜单可见性:\n');
    
    let hasMenuIssues = false;
    
    Object.entries(MENU_PERMISSIONS).forEach(([menuName, config]) => {
      const hasAccess = checkMenuAccess(fullUser, menuName, config);
      const status = hasAccess ? '✅ 可见' : '❌ 隐藏';
      
      console.log(`   ${menuName}: ${status}`);
      
      if (config.roles) {
        console.log(`     需要角色: [${config.roles.join(', ')}]`);
        console.log(`     用户角色: [${roles.join(', ') || '无'}]`);
      }
      
      if (config.permissions) {
        console.log(`     需要权限: [${config.permissions.join(', ')}]`);
        console.log(`     用户权限: [${permissions.filter(p => config.permissions.includes(p)).join(', ') || '无匹配'}]`);
      }
      
      // 检查是否是问题菜单
      if (['教材输入', 'AI生成工作台', '试题审核'].includes(menuName) && !hasAccess) {
        hasMenuIssues = true;
        console.log(`     ⚠️  这是用户反映丢失的菜单！`);
      }
      
      console.log();
    });

    // 6. 问题诊断
    console.log('🔍 5. 问题诊断...');
    
    if (!hasMenuIssues) {
      console.log('✅ 根据数据库权限配置，用户应该能看到所有菜单');
      console.log('🤔 可能的问题原因:');
      console.log('   1. 前端缓存问题 - 建议清除浏览器缓存');
      console.log('   2. 前端状态同步问题 - 检查authStore中的用户数据');
      console.log('   3. Token过期或无效 - 检查JWT token状态');
      console.log('   4. 前端权限检查逻辑异常 - 检查PermissionGuard组件');
    } else {
      console.log('❌ 发现权限配置问题！');
      console.log('🔧 需要修复的权限:');
      
      // 检查缺失的权限
      const requiredPermissions = ['materials.create', 'questions.generate', 'questions.review'];
      const missingPermissions = requiredPermissions.filter(p => !permissions.includes(p));
      
      if (missingPermissions.length > 0) {
        console.log('   缺失权限:', missingPermissions.join(', '));
      }
      
      // 检查角色问题
      if (roles.length === 0) {
        console.log('   用户未分配任何角色');
      }
    }
    
    console.log();

    // 7. 建议的修复方案
    console.log('💡 6. 建议的修复方案...');
    
    if (hasMenuIssues) {
      console.log('数据库权限修复:');
      const requiredPermissions = ['materials.create', 'questions.generate', 'questions.review'];
      const missingPermissions = requiredPermissions.filter(p => !permissions.includes(p));
      
      if (missingPermissions.length > 0) {
        console.log('执行以下SQL语句添加缺失权限:');
        missingPermissions.forEach(permission => {
          console.log(`INSERT INTO user_permissions (user_id, permission_id) `);
          console.log(`SELECT '${user.id}', id FROM permissions WHERE name = '${permission}';`);
        });
      }
      
      if (roles.length === 0) {
        console.log('为用户分配基础角色:');
        console.log(`INSERT INTO user_roles (user_id, role_id) `);
        console.log(`SELECT '${user.id}', id FROM roles WHERE name = 'user';`);
      }
    } else {
      console.log('前端问题排查:');
      console.log('1. 让用户清除浏览器缓存并重新登录');
      console.log('2. 检查浏览器开发者工具中的localStorage和sessionStorage');
      console.log('3. 检查网络请求中的用户信息API响应');
      console.log('4. 检查前端控制台是否有JavaScript错误');
    }
    
    console.log();
    console.log('=== 调试报告结束 ===');
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  }
}

// 执行调试
debugUserMenuIssue().then(() => {
  console.log('\n调试完成，请查看上述报告。');
}).catch(error => {
  console.error('调试失败:', error);
});