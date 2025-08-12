/**
 * 检查数据库中试题的状态分布
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuestionStatus() {
  try {
    console.log('正在检查试题状态分布...');
    
    // 获取所有试题的状态统计
    const { data: allQuestions, error } = await supabase
      .from('questions')
      .select('id, status, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('查询失败:', error);
      return;
    }
    
    console.log(`\n总试题数量: ${allQuestions.length}`);
    
    // 统计各状态的数量
    const statusCounts = {};
    allQuestions.forEach(q => {
      statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
    });
    
    console.log('\n状态分布:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // 特别检查ai_rejected状态的试题
    const aiRejectedQuestions = allQuestions.filter(q => q.status === 'ai_rejected');
    console.log(`\nAI审核拒绝的试题数量: ${aiRejectedQuestions.length}`);
    
    if (aiRejectedQuestions.length > 0) {
      console.log('AI审核拒绝的试题详情:');
      aiRejectedQuestions.slice(0, 5).forEach((q, index) => {
        console.log(`  ${index + 1}. ID: ${q.id}, 创建时间: ${q.created_at}`);
      });
    } else {
      console.log('❌ 数据库中没有状态为 ai_rejected 的试题');
    }
    
    // 检查最近的试题状态
    console.log('\n最近10条试题的状态:');
    allQuestions.slice(0, 10).forEach((q, index) => {
      console.log(`  ${index + 1}. ID: ${q.id.substring(0, 8)}..., 状态: ${q.status}, 时间: ${q.created_at}`);
    });
    
  } catch (error) {
    console.error('检查失败:', error);
  }
}

checkQuestionStatus();