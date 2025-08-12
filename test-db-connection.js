/**
 * 测试数据库连接和表结构
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const testDatabase = async () => {
  console.log('=== 测试数据库连接和表结构 ===');
  
  // 测试users表
  console.log('\n1. 测试users表:');
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(3);
    
    if (usersError) {
      console.error('Users表错误:', usersError);
    } else {
      console.log('Users表数据:', users);
    }
  } catch (error) {
    console.error('Users表查询异常:', error);
  }
  
  // 测试user_roles表
  console.log('\n2. 测试user_roles表:');
  try {
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(3);
    
    if (userRolesError) {
      console.error('User_roles表错误:', userRolesError);
    } else {
      console.log('User_roles表数据:', userRoles);
    }
  } catch (error) {
    console.error('User_roles表查询异常:', error);
  }
  
  // 测试roles表
  console.log('\n3. 测试roles表:');
  try {
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(3);
    
    if (rolesError) {
      console.error('Roles表错误:', rolesError);
    } else {
      console.log('Roles表数据:', roles);
    }
  } catch (error) {
    console.error('Roles表查询异常:', error);
  }
  
  // 测试复杂查询（模拟API中的查询）
  console.log('\n4. 测试复杂查询（模拟用户列表API）:');
  try {
    const { data: complexQuery, error: complexError } = await supabase
      .from('users')
      .select(`
        id, email, name, organization, email_verified, created_at, last_login_at,
        user_roles (
          roles (
            name,
            description
          )
        )
      `)
      .limit(3);
    
    if (complexError) {
      console.error('复杂查询错误:', complexError);
    } else {
      console.log('复杂查询结果:', JSON.stringify(complexQuery, null, 2));
    }
  } catch (error) {
    console.error('复杂查询异常:', error);
  }
};

testDatabase().catch(console.error);