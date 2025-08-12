/**
 * 测试试题审核流程
 */

const API_BASE = 'http://localhost:3003/api';

async function testReviewFlow() {
  console.log('🔍 开始测试试题审核流程...\n');

  try {
    // 1. 获取待审核试题列表
    console.log('1. 获取待审核试题列表...');
    const pendingResponse = await fetch(`${API_BASE}/review/pending`);
    const pendingData = await pendingResponse.json();
    
    if (!pendingData.success) {
      throw new Error('获取待审核试题失败');
    }
    
    const questions = pendingData.data.questions;
    console.log(`✅ 获取到 ${questions.length} 道待审核试题`);
    
    if (questions.length === 0) {
      console.log('❌ 没有待审核试题，请先创建一些试题');
      return;
    }
    
    console.log('试题列表:');
    questions.slice(0, 3).forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.stem.substring(0, 50)}...`);
    });

    // 2. 测试AI自动审核
    console.log('\n2. 测试AI自动审核...');
    const firstQuestion = questions[0];
    console.log(`   审核试题: ${firstQuestion.stem.substring(0, 30)}...`);
    
    try {
      const reviewResponse = await fetch(`${API_BASE}/review/ai-review/${firstQuestion.id}`, {
        method: 'POST'
      });
      const reviewData = await reviewResponse.json();
      
      if (reviewData.success) {
        console.log('✅ AI审核成功');
        console.log(`   质量评分: ${reviewData.data.qualityScore}`);
        console.log(`   是否通过: ${reviewData.data.isValid ? '是' : '否'}`);
        if (reviewData.data.issues.length > 0) {
          console.log(`   发现问题: ${reviewData.data.issues.length} 个`);
          reviewData.data.issues.forEach(issue => {
            console.log(`     - ${issue.description} (${issue.severity})`);
          });
        }
      } else {
        console.log('❌ AI审核失败:', reviewData.error);
      }
    } catch (error) {
      console.log('❌ AI审核失败:', error.message);
    }

    // 3. 测试批量AI审核
    console.log('\n3. 测试批量AI审核...');
    const questionIds = questions.slice(0, 3).map(q => q.id);
    
    try {
      const batchResponse = await fetch(`${API_BASE}/review/batch-ai-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionIds: questionIds
        })
      });
      const batchData = await batchResponse.json();
      
      if (batchData.success) {
        console.log(`✅ 批量AI审核完成，处理了 ${batchData.data.length} 道试题`);
        batchData.data.forEach(result => {
          console.log(`   试题 ${result.questionId}: 评分 ${result.qualityScore}, ${result.isValid ? '通过' : '未通过'}`);
        });
      } else {
        console.log('❌ 批量AI审核失败:', batchData.error);
      }
    } catch (error) {
      console.log('❌ 批量AI审核失败:', error.message);
    }

    // 4. 获取审核统计信息
    console.log('\n4. 获取审核统计信息...');
    try {
      const statsResponse = await fetch(`${API_BASE}/review/stats`);
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        console.log('✅ 审核统计信息:');
        console.log(`   待审核: ${statsData.data.pending || 0} 道`);
        console.log(`   已通过: ${statsData.data.approved || 0} 道`);
        console.log(`   已拒绝: ${statsData.data.rejected || 0} 道`);
        console.log(`   平均质量评分: ${statsData.data.averageScore || 0}`);
      } else {
        console.log('❌ 获取统计信息失败:', statsData.error);
      }
    } catch (error) {
      console.log('❌ 获取统计信息失败:', error.message);
    }

    console.log('\n🎉 审核流程测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testReviewFlow();