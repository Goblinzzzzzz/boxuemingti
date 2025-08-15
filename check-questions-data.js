/**
 * 检查数据库中的试题数据
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

async function checkQuestionsData() {
  console.log('=== 检查试题数据 ===');
  
  try {
    // 1. 检查所有试题的状态分布
    console.log('\n1. 试题状态分布:');
    const { data: allQuestions, error: allError } = await supabase
      .from('questions')
      .select('status')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('查询所有试题失败:', allError);
    } else {
      const statusCount = {};
      allQuestions.forEach(q => {
        statusCount[q.status] = (statusCount[q.status] || 0) + 1;
      });
      console.log('状态统计:', statusCount);
    }
    
    // 2. 检查approved状态的试题
    console.log('\n2. 审核通过的试题:');
    const { data: approvedQuestions, error: approvedError } = await supabase
      .from('questions')
      .select(`
        id, stem, status, created_at,
        generation_tasks(id, created_by)
      `)
      .eq('status', 'approved')
      .limit(10);
    
    if (approvedError) {
      console.error('查询审核通过试题失败:', approvedError);
    } else {
      console.log(`找到 ${approvedQuestions.length} 道审核通过的试题`);
      approvedQuestions.forEach((q, index) => {
        console.log(`${index + 1}. ID: ${q.id}`);
        console.log(`   题干: ${q.stem?.substring(0, 50)}...`);
        console.log(`   创建者: ${q.generation_tasks?.created_by}`);
        console.log(`   创建时间: ${q.created_at}`);
        console.log('---');
      });
    }
    
    // 3. 检查特定用户的试题
    console.log('\n3. 检查用户zhaodan@ke.com的试题:');
    
    // 先获取用户ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'zhaodan@ke.com')
      .single();
    
    if (userError) {
      console.error('获取用户ID失败:', userError);
    } else {
      console.log('用户ID:', user.id);
      
      // 查询该用户的试题
      const { data: userQuestions, error: userQuestionsError } = await supabase
        .from('questions')
        .select(`
          id, stem, status, created_at,
          generation_tasks!inner(created_by)
        `)
        .eq('generation_tasks.created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (userQuestionsError) {
        console.error('查询用户试题失败:', userQuestionsError);
      } else {
        console.log(`用户共有 ${userQuestions.length} 道试题`);
        
        const userStatusCount = {};
        userQuestions.forEach(q => {
          userStatusCount[q.status] = (userStatusCount[q.status] || 0) + 1;
        });
        console.log('用户试题状态分布:', userStatusCount);
        
        // 显示用户的审核通过试题
        const approvedUserQuestions = userQuestions.filter(q => q.status === 'approved');
        console.log(`\n用户审核通过的试题 (${approvedUserQuestions.length} 道):`);
        approvedUserQuestions.forEach((q, index) => {
          console.log(`${index + 1}. ID: ${q.id}`);
          console.log(`   题干: ${q.stem?.substring(0, 50)}...`);
          console.log(`   状态: ${q.status}`);
          console.log('---');
        });
      }
    }
    
    // 4. 检查generation_tasks表
    console.log('\n4. 检查generation_tasks表:');
    const { data: tasks, error: tasksError } = await supabase
      .from('generation_tasks')
      .select('id, created_by, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (tasksError) {
      console.error('查询generation_tasks失败:', tasksError);
    } else {
      console.log('最近的生成任务:');
      tasks.forEach((task, index) => {
        console.log(`${index + 1}. ID: ${task.id}`);
        console.log(`   创建者: ${task.created_by}`);
        console.log(`   状态: ${task.status}`);
        console.log(`   创建时间: ${task.created_at}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('检查试题数据异常:', error);
  }
}

checkQuestionsData().catch(console.error);