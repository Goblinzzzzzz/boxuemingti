import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('错误：请在.env文件中配置SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ADMIN_EMAIL = 'zhaodan@ke.com';

async function verifyAdmin() {
  try {
    console.log('验证超级管理员配置...');
    
    // 查询用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, organization, email_verified, created_at')
      .eq('email', ADMIN_EMAIL)
      .single();
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log('❌ 用户不存在');
        console.log('请先运行 setup-admin.js 创建管理员账号');
        return;
      }
      throw userError;
    }
    
    // 查询用户角色
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name,
          description
        )
      `)
      .eq('user_id', user.id);
    
    if (rolesError) {
      throw rolesError;
    }
    
    console.log('\n=== 用户信息 ===');
    console.log(`邮箱: ${user.email}`);
    console.log(`姓名: ${user.name}`);
    console.log(`组织: ${user.organization || '未设置'}`);
    console.log(`邮箱验证: ${user.email_verified ? '✅ 已验证' : '❌ 未验证'}`);
    console.log(`创建时间: ${new Date(user.created_at).toLocaleString('zh-CN')}`);
    
    // 检查角色
    const roles = userRoles?.map(ur => ur.roles.name) || [];
    console.log('\n=== 角色信息 ===');
    
    if (roles.length === 0) {
      console.log('❌ 用户没有分配任何角色');
    } else {
      console.log('用户角色:');
      userRoles.forEach(ur => {
        console.log(`  - ${ur.roles.name}: ${ur.roles.description}`);
      });
    }
    
    // 检查是否为管理员
    const isAdmin = roles.includes('admin');
    console.log('\n=== 权限验证 ===');
    console.log(`管理员权限: ${isAdmin ? '✅ 已配置' : '❌ 未配置'}`);
    
    if (isAdmin) {
      // 查询管理员权限
      const { data: permissions, error: permError } = await supabase
        .rpc('get_user_permissions', { user_uuid: user.id });
      
      if (!permError && permissions) {
        console.log('\n=== 权限列表 ===');
        permissions.forEach(permission => {
          console.log(`  ✅ ${permission}`);
        });
      }
      
      console.log('\n🎉 超级管理员配置验证成功！');
      console.log('\n登录信息:');
      console.log(`登录地址: http://localhost:5176/login`);
      console.log(`邮箱: ${ADMIN_EMAIL}`);
      console.log(`默认密码: admin123456`);
      console.log('\n⚠️  请在首次登录后修改默认密码');
    } else {
      console.log('\n❌ 用户不是管理员，请运行 setup-admin.js 分配管理员角色');
    }
    
  } catch (error) {
    console.error('验证失败:', error.message);
    process.exit(1);
  }
}

// 执行验证
verifyAdmin();