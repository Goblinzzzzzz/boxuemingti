// 测试AI服务的教材内容引用功能
async function testAITextbookReference() {
  console.log('🔍 测试AI服务的教材内容引用功能...\n');
  
  try {
    // 1. 获取一个教材
    console.log('1. 获取教材列表...');
    const materialsResponse = await fetch('http://localhost:3003/api/materials');
    if (!materialsResponse.ok) {
      throw new Error(`获取教材列表失败: ${materialsResponse.status}`);
    }
    
    const materialsData = await materialsResponse.json();
    console.log(`   找到 ${materialsData.data.length} 个教材`);
    
    if (materialsData.data.length === 0) {
      console.log('❌ 没有教材可以测试，请先上传一些教材');
      return;
    }
    
    // 选择有有效内容的教材（避免PDF解析错误的教材）
    console.log('\n   检查教材有效性:');
    materialsData.data.forEach((m, index) => {
      const isValid = m.content && 
        m.content.length > 100 && 
        !m.content.includes('需要专门的解析库处理') &&
        !m.content.includes('ç¬¬äº');
      console.log(`   教材${index + 1}: ${m.title} - 长度:${m.content?.length || 0} - 有效:${isValid}`);
    });
    
    const validMaterials = materialsData.data.filter(m => 
      m.content && 
      m.content.length > 100 && 
      !m.content.includes('需要专门的解析库处理') &&
      !m.content.includes('ç¬¬äº')
    );
    
    console.log(`\n   找到 ${validMaterials.length} 个有效教材`);
    
    if (validMaterials.length === 0) {
      console.log('❌ 没有找到有效的教材内容，请上传一些文本教材');
      return;
    }
    
    const testMaterial = validMaterials[0];
    console.log(`\n2. 选择测试教材: ${testMaterial.title}`);
    console.log(`   教材内容长度: ${testMaterial.content.length} 字符`);
    console.log(`   教材内容预览: ${testMaterial.content.substring(0, 200)}...`);
    
    // 3. 创建生成任务
    console.log('\n3. 创建AI生成任务...');
    const generateResponse = await fetch('http://localhost:3003/api/generation/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        materialId: testMaterial.id,
        questionCount: 1, // 只生成1道题进行测试
        questionTypes: ['单选题'],
        difficulty: '中',
        knowledgePoints: []
      })
    });
    
    if (!generateResponse.ok) {
      throw new Error(`创建生成任务失败: ${generateResponse.status}`);
    }
    
    const generateData = await generateResponse.json();
    const taskId = generateData.data.id;
    console.log(`   任务ID: ${taskId}`);
    
    // 4. 等待任务完成
    console.log('\n4. 等待任务完成...');
    let attempts = 0;
    const maxAttempts = 30; // 最多等待30秒
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      
      const statusResponse = await fetch(`http://localhost:3003/api/generation/tasks/${taskId}/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`   任务状态: ${statusData.data.status}, 进度: ${statusData.data.progress || 0}%`);
        
        if (statusData.data.status === 'completed') {
          console.log('✅ 任务完成!');
          break;
        } else if (statusData.data.status === 'failed') {
          console.log('❌ 任务失败!');
          return;
        }
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log('❌ 任务超时');
      return;
    }
    
    // 5. 获取生成的试题
    console.log('\n5. 获取生成的试题...');
    const questionsResponse = await fetch(`http://localhost:3003/api/generation/tasks/${taskId}`);
    if (!questionsResponse.ok) {
      throw new Error(`获取试题失败: ${questionsResponse.status}`);
    }
    
    const questionsData = await questionsResponse.json();
    const questions = questionsData.data.result?.questions || [];
    
    if (questions.length === 0) {
      console.log('❌ 没有生成任何试题');
      return;
    }
    
    // 6. 分析教材原文引用质量
    console.log('\n6. 分析教材原文引用质量...');
    const question = questions[0];
    
    console.log(`\n📝 生成的试题:`);
    console.log(`题干: ${question.stem}`);
    console.log(`选项: ${JSON.stringify(question.options)}`);
    console.log(`正确答案: ${question.correct_answer}`);
    
    console.log(`\n📖 解析分析:`);
    console.log(`教材原文: ${question.analysis.textbook}`);
    console.log(`试题分析: ${question.analysis.explanation}`);
    console.log(`答案结论: ${question.analysis.conclusion}`);
    
    // 7. 评估引用质量
    console.log(`\n🎯 引用质量评估:`);
    
    // 检查是否包含模拟数据标识
    const hasSimulationText = question.analysis.textbook.includes('模拟试题') || 
                             question.analysis.textbook.includes('模拟数据');
    
    if (hasSimulationText) {
      console.log('❌ 仍在使用模拟数据，AI服务可能未正常工作');
    } else {
      console.log('✅ 已使用真实AI生成内容');
    }
    
    // 检查是否包含教材标准格式
    const hasStandardFormat = question.analysis.textbook.includes('第5届HR搏学考试辅导教材');
    console.log(`教材标准格式: ${hasStandardFormat ? '✅ 符合' : '❌ 不符合'}`);
    
    // 检查是否有具体内容引用
    const hasSpecificContent = question.analysis.textbook.length > 50 && 
                              !question.analysis.textbook.includes('泛泛而谈');
    console.log(`内容具体性: ${hasSpecificContent ? '✅ 具体' : '❌ 过于简单'}`);
    
    // 检查解析结构
    const hasProperAnalysis = question.analysis.explanation.includes('试题分析');
    const hasProperConclusion = question.analysis.conclusion.includes('本题答案为');
    console.log(`解析结构: ${hasProperAnalysis ? '✅ 符合' : '❌ 不符合'}`);
    console.log(`结论格式: ${hasProperConclusion ? '✅ 符合' : '❌ 不符合'}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAITextbookReference();