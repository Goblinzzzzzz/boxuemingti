/**
 * AI生成试题调试脚本
 * 用于测试AI服务的实际生成功能
 */

import { aiService } from './api/services/aiService.ts';

async function testAIGeneration() {
  console.log('🔍 开始调试AI生成试题功能...');
  
  // 1. 检查AI服务状态
  console.log('\n1. AI服务状态检查:');
  const status = aiService.getStatus();
  console.log(JSON.stringify(status, null, 2));
  
  if (!status.available) {
    console.error('❌ AI服务不可用，请检查配置');
    return;
  }
  
  // 2. 测试试题生成
  console.log('\n2. 测试试题生成:');
  const testParams = {
    content: `人力资源管理是指运用现代管理方法，对人力资源的获取、开发、保持和利用等方面所进行的计划、组织、指挥、控制和协调等一系列活动。
    
    人力资源管理的主要职能包括：
    1. 人力资源规划：根据组织战略目标，制定人力资源需求计划
    2. 招聘与选拔：通过科学的方法选择合适的人才
    3. 培训与开发：提升员工的知识、技能和能力
    4. 绩效管理：建立科学的绩效评估体系
    5. 薪酬管理：设计公平合理的薪酬体系
    6. 员工关系：维护良好的劳动关系`,
    questionType: '单选题',
    difficulty: '中',
    knowledgePoint: '人力资源管理基础'
  };
  
  try {
    console.log('生成参数:', JSON.stringify(testParams, null, 2));
    console.log('\n开始生成试题...');
    
    const startTime = Date.now();
    const question = await aiService.generateQuestion(testParams);
    const endTime = Date.now();
    
    console.log(`\n✅ 生成成功！耗时: ${endTime - startTime}ms`);
    console.log('\n生成的试题:');
    console.log(JSON.stringify(question, null, 2));
    
    // 3. 验证试题结构
    console.log('\n3. 验证试题结构:');
    const requiredFields = ['stem', 'options', 'correct_answer', 'analysis', 'quality_score'];
    const missingFields = requiredFields.filter(field => !question[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ 试题结构完整');
    } else {
      console.log('❌ 缺少字段:', missingFields);
    }
    
    // 4. 验证选项格式
    console.log('\n4. 验证选项格式:');
    if (typeof question.options === 'object' && question.options !== null) {
      const optionKeys = Object.keys(question.options);
      console.log('选项键:', optionKeys);
      console.log('✅ 选项格式正确');
    } else {
      console.log('❌ 选项格式错误:', typeof question.options);
    }
    
    // 5. 验证解析结构
    console.log('\n5. 验证解析结构:');
    if (question.analysis && typeof question.analysis === 'object') {
      const analysisFields = ['textbook', 'explanation', 'conclusion'];
      const missingAnalysisFields = analysisFields.filter(field => !question.analysis[field]);
      
      if (missingAnalysisFields.length === 0) {
        console.log('✅ 解析结构完整');
      } else {
        console.log('❌ 解析缺少字段:', missingAnalysisFields);
      }
    } else {
      console.log('❌ 解析结构错误');
    }
    
  } catch (error) {
    console.error('\n❌ 生成失败:', error.message);
    console.error('错误详情:', error);
    
    // 检查是否是网络问题
    if (error.message.includes('fetch')) {
      console.log('\n🔍 可能的网络问题，检查API连接...');
    }
    
    // 检查是否是API密钥问题
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n🔍 可能的API密钥问题，检查配置...');
    }
    
    // 检查是否是模型问题
    if (error.message.includes('model')) {
      console.log('\n🔍 可能的模型问题，检查模型配置...');
    }
  }
}

// 运行测试
testAIGeneration().catch(console.error);