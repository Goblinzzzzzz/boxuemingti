/**
 * 完整AI生成流程测试脚本
 * 测试从创建任务到获取结果的完整流程
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3003';

// 等待服务器启动的辅助函数
async function waitForServer(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { method: 'GET' });
      if (response.ok) {
        console.log('✅ 服务器已就绪');
        return true;
      }
    } catch (error) {
      console.log(`等待服务器启动... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log('⚠️ 服务器可能未完全启动，继续尝试...');
  return false;
}

async function testFullGenerationFlow() {
  console.log('🔍 测试完整AI生成流程...');
  
  // 等待服务器启动
  await waitForServer();
  
  try {
    // 1. 创建生成任务
    console.log('\n1. 创建生成任务...');
    const createResponse = await fetch(`${BASE_URL}/api/generation/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        materialId: 1, // 使用测试教材ID
        questionCount: 2,
        questionTypes: ['单选题'],
        difficulty: '中',
        knowledgePoints: ['人力资源管理基础']
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`创建任务失败: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createResult = await createResponse.json();
    console.log('任务创建成功:', createResult);
    
    const taskId = createResult.taskId;
    if (!taskId) {
      throw new Error('未获取到任务ID');
    }
    
    // 2. 轮询任务状态
    console.log('\n2. 轮询任务状态...');
    let attempts = 0;
    const maxAttempts = 30; // 最多等待30次，每次2秒
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
      attempts++;
      
      const statusResponse = await fetch(`${BASE_URL}/api/generation/tasks/${taskId}/status`);
      if (!statusResponse.ok) {
        throw new Error(`获取任务状态失败: ${statusResponse.status}`);
      }
      
      const statusResult = await statusResponse.json();
      console.log(`第${attempts}次检查 - 状态: ${statusResult.status}, 进度: ${statusResult.progress}%`);
      
      if (statusResult.status === 'completed') {
        console.log('✅ 任务完成!');
        console.log('生成的试题数量:', statusResult.questions?.length || 0);
        
        if (statusResult.questions && statusResult.questions.length > 0) {
          console.log('\n生成的试题:');
          statusResult.questions.forEach((q, index) => {
            console.log(`\n试题 ${index + 1}:`);
            console.log('题干:', q.stem);
            console.log('选项:', q.options);
            console.log('正确答案:', q.correct_answer);
            console.log('质量分数:', q.quality_score);
          });
        }
        break;
      } else if (statusResult.status === 'failed') {
        console.error('❌ 任务失败:', statusResult.error);
        break;
      }
    }
    
    if (attempts >= maxAttempts) {
      console.error('❌ 任务超时，未在预期时间内完成');
    }
    
    // 3. 获取任务详情
    console.log('\n3. 获取任务详情...');
    const detailResponse = await fetch(`${BASE_URL}/api/generation/tasks/${taskId}`);
    if (!detailResponse.ok) {
      throw new Error(`获取任务详情失败: ${detailResponse.status}`);
    }
    
    const detailResult = await detailResponse.json();
    console.log('任务详情:', {
      id: detailResult.id,
      status: detailResult.status,
      progress: detailResult.progress,
      questionsCount: detailResult.result?.questions?.length || 0,
      createdAt: detailResult.created_at,
      completedAt: detailResult.completed_at
    });
    
    // 4. 验证数据结构
    console.log('\n4. 验证数据结构...');
    if (detailResult.result?.questions) {
      console.log('✅ 任务结果包含试题数据');
      console.log('试题数据结构正确:', detailResult.result.questions.length > 0);
    } else {
      console.log('❌ 任务结果缺少试题数据');
      console.log('实际结果结构:', Object.keys(detailResult.result || {}));
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testFullGenerationFlow().catch(console.error);