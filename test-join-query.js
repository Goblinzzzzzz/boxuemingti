/**
 * 测试JOIN查询逻辑
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

async function testJoinQuery() {
  console.log('=== 测试JOIN查询逻辑 ===');
  
  const userId = '7078380e-e0a2-4cde-b0cd-d9b381351fa0'; // zhaodan@ke.com的用户ID
  
  try {
    // 1. 测试基本的questions查询
    console.log('\n1. 基本questions查询:');
    const { data: basicQuestions, error: basicError } = await supabase
      .from('questions')
      .select('id, stem, status, task_id')
      .eq('status', 'approved')
      .limit(5);
    
    if (basicError) {
      console.error('基本查询失败:', basicError);
    } else {
      console.log(`找到 ${basicQuestions.length} 道审核通过的试题`);
      basicQuestions.forEach(q => {
        console.log(`- ID: ${q.id}, task_id: ${q.task_id}`);
      });
    }
    
    // 2. 测试generation_tasks查询
    console.log('\n2. generation_tasks查询:');
    const { data: tasks, error: tasksError } = await supabase
      .from('generation_tasks')
      .select('id, created_by')
      .eq('created_by', userId)
      .limit(5);
    
    if (tasksError) {
      console.error('tasks查询失败:', tasksError);
    } else {
      console.log(`用户有 ${tasks.length} 个生成任务`);
      tasks.forEach(t => {
        console.log(`- Task ID: ${t.id}`);
      });
    }
    
    // 3. 测试简单JOIN查询
    console.log('\n3. 简单JOIN查询:');
    const { data: simpleJoin, error: simpleJoinError } = await supabase
      .from('questions')
      .select(`
        id, stem, status, task_id,
        generation_tasks(id, created_by)
      `)
      .eq('status', 'approved')
      .limit(5);
    
    if (simpleJoinError) {
      console.error('简单JOIN查询失败:', simpleJoinError);
    } else {
      console.log(`JOIN查询返回 ${simpleJoin.length} 条记录`);
      simpleJoin.forEach(q => {
        console.log(`- Question ID: ${q.id}, Task: ${q.generation_tasks?.id}, Creator: ${q.generation_tasks?.created_by}`);
      });
    }
    
    // 4. 测试带用户过滤的JOIN查询
    console.log('\n4. 带用户过滤的JOIN查询:');
    const { data: userJoin, error: userJoinError } = await supabase
      .from('questions')
      .select(`
        id, stem, status, task_id,
        generation_tasks!inner(id, created_by)
      `)
      .eq('status', 'approved')
      .eq('generation_tasks.created_by', userId)
      .limit(5);
    
    if (userJoinError) {
      console.error('用户过滤JOIN查询失败:', userJoinError);
    } else {
      console.log(`用户过滤JOIN查询返回 ${userJoin.length} 条记录`);
      userJoin.forEach(q => {
        console.log(`- Question ID: ${q.id}`);
        console.log(`  题干: ${q.stem?.substring(0, 50)}...`);
        console.log(`  Task: ${q.generation_tasks?.id}`);
        console.log(`  Creator: ${q.generation_tasks?.created_by}`);
        console.log('---');
      });
    }
    
    // 5. 检查questions表中task_id和generation_tasks表的关联
    console.log('\n5. 检查task_id关联:');
    const { data: approvedQuestions, error: approvedError } = await supabase
      .from('questions')
      .select('id, stem, status, task_id')
      .eq('status', 'approved');
    
    if (approvedError) {
      console.error('查询审核通过试题失败:', approvedError);
    } else {
      console.log('检查每道审核通过试题的task_id:');
      for (const question of approvedQuestions) {
        const { data: task, error: taskError } = await supabase
          .from('generation_tasks')
          .select('id, created_by')
          .eq('id', question.task_id)
          .single();
        
        if (taskError) {
          console.log(`- Question ${question.id}: task_id ${question.task_id} 不存在`);
        } else {
          console.log(`- Question ${question.id}: task_id ${question.task_id}, creator: ${task.created_by}`);
        }
      }
    }
    
  } catch (error) {
    console.error('测试JOIN查询异常:', error);
  }
}

testJoinQuery().catch(console.error);