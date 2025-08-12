import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
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

// 要配置为管理员的用户信息
const ADMIN_EMAIL = 'zhaodan@ke.com';
const ADMIN_NAME = '赵丹';
const ADMIN_PASSWORD = 'admin123456'; // 默认密码，建议首次登录后修改
const ADMIN_ORGANIZATION = 'HR搏学';

async function setupAdmin() {
  try {
    console.log('开始配置超级管理员账号...');
    
    // 1. 检查用户是否已存在
    console.log(`检查用户 ${ADMIN_EMAIL} 是否存在...`);
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', ADMIN_EMAIL)
      .single();
    
    let userId;
    
    if (existingUser) {
      console.log(`用户已存在: ${existingUser.name} (${existingUser.email})`);
      userId = existingUser.id;
    } else {
      // 2. 创建新用户
      console.log('用户不存在，正在创建新用户...');
      
      // 生成密码哈希
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          password_hash: passwordHash,
          organization: ADMIN_ORGANIZATION,
          email_verified: true
        })
        .select('id, email, name')
        .single();
      
      if (createError) {
        throw new Error(`创建用户失败: ${createError.message}`);
      }
      
      console.log(`用户创建成功: ${newUser.name} (${newUser.email})`);
      userId = newUser.id;
    }
    
    // 3. 获取admin角色ID
    console.log('获取admin角色信息...');
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', 'admin')
      .single();
    
    if (roleError || !adminRole) {
      throw new Error(`获取admin角色失败: ${roleError?.message || '角色不存在'}`);
    }
    
    // 4. 检查用户是否已有admin角色
    console.log('检查用户角色分配...');
    const { data: existingRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', adminRole.id)
      .single();
    
    if (existingRole) {
      console.log('用户已经拥有admin角色');
    } else {
      // 5. 分配admin角色
      console.log('正在分配admin角色...');
      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: adminRole.id
        });
      
      if (assignError) {
        throw new Error(`分配admin角色失败: ${assignError.message}`);
      }
      
      console.log('admin角色分配成功');
    }
    
    // 6. 验证配置结果
    console.log('\n验证配置结果...');
    const { data: userRoles, error: verifyError } = await supabase
      .from('user_roles')
      .select(`
        roles (name, description)
      `)
      .eq('user_id', userId);
    
    if (verifyError) {
      throw new Error(`验证失败: ${verifyError.message}`);
    }
    
    console.log('\n=== 配置完成 ===');
    console.log(`用户邮箱: ${ADMIN_EMAIL}`);
    console.log(`用户姓名: ${ADMIN_NAME}`);
    console.log(`默认密码: ${ADMIN_PASSWORD}`);
    console.log('用户角色:', userRoles.map(ur => ur.roles.name).join(', '));
    console.log('\n注意事项:');
    console.log('1. 请在首次登录后修改默认密码');
    console.log('2. 管理员可以访问所有功能模块');
    console.log('3. 登录地址: http://localhost:5176/login');
    
  } catch (error) {
    console.error('配置失败:', error.message);
    process.exit(1);
  }
}

// 执行配置
setupAdmin();