/**
 * UAT测试数据清理脚本
 * 清空所有试题和生成任务数据，为全面UAT测试做准备
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllDataForUAT() {
  console.log('🧹 开始清理UAT测试数据...');
  
  try {
    // 1. 首先查看当前数据量
    console.log('\n📊 检查当前数据量...');
    
    const { count: questionsCount } = await supabase
      .from('questions')
      .select('id', { count: 'exact' });
    
    const { count: tasksCount } = await supabase
      .from('generation_tasks')
      .select('id', { count: 'exact' });
    
    console.log(`📝 当前试题数量: ${questionsCount || 0}`);
    console.log(`🔄 当前生成任务数量: ${tasksCount || 0}`);
    
    if ((questionsCount || 0) === 0 && (tasksCount || 0) === 0) {
      console.log('✅ 数据库已经是空的，无需清理');
      return;
    }
    
    // 2. 删除所有试题数据（由于外键约束，需要先删除questions）
    console.log('\n🗑️  删除所有试题数据...');
    const { error: questionsError } = await supabase
      .from('questions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录的技巧
    
    if (questionsError) {
      console.error('❌ 删除试题数据失败:', questionsError);
      throw questionsError;
    }
    
    console.log('✅ 试题数据删除成功');
    
    // 3. 删除所有生成任务数据
    console.log('\n🗑️  删除所有生成任务数据...');
    const { error: tasksError } = await supabase
      .from('generation_tasks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录的技巧
    
    if (tasksError) {
      console.error('❌ 删除生成任务数据失败:', tasksError);
      throw tasksError;
    }
    
    console.log('✅ 生成任务数据删除成功');
    
    // 4. 验证清理结果
    console.log('\n🔍 验证清理结果...');
    
    const { count: finalQuestionsCount } = await supabase
      .from('questions')
      .select('id', { count: 'exact' });
    
    const { count: finalTasksCount } = await supabase
      .from('generation_tasks')
      .select('id', { count: 'exact' });
    
    console.log(`📝 清理后试题数量: ${finalQuestionsCount || 0}`);
    console.log(`🔄 清理后生成任务数量: ${finalTasksCount || 0}`);
    
    if ((finalQuestionsCount || 0) === 0 && (finalTasksCount || 0) === 0) {
      console.log('\n🎉 UAT测试数据清理完成！');
      console.log('✅ 数据库已清空，可以开始全面UAT测试');
      console.log('\n📋 UAT测试建议流程:');
      console.log('1. 测试教材上传功能');
      console.log('2. 测试AI试题生成功能');
      console.log('3. 测试试题提交审核功能');
      console.log('4. 测试试题审核页面显示');
      console.log('5. 测试试题审核操作（批准/拒绝）');
      console.log('6. 测试试题库功能');
    } else {
      console.log('⚠️  数据清理可能不完整，请检查');
    }
    
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行清理
clearAllDataForUAT();