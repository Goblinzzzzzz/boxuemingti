import fetch from 'node-fetch';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZGY0ZjMzMi0xM2FjLTQ4MjEtOTdiZC05ODIzYzM0ODM1OWYiLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwicm9sZXMiOlsidXNlciJdLCJpYXQiOjE3NTUxNDI3OTUsImV4cCI6MTc1NTIyOTE5NX0.e3FH_VCvPC-zi-UIVBXgch8px87_N0rER0xf2miEl0w';

async function testQuestionsAPI() {
  try {
    console.log('测试 /api/questions 接口...');
    
    const response = await fetch('http://localhost:3003/api/questions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('响应状态:', response.status);
    console.log('响应状态文本:', response.statusText);
    
    const data = await response.text();
    console.log('响应内容:');
    console.log(data);
    
    if (response.ok) {
      try {
        const jsonData = JSON.parse(data);
        console.log('\n解析后的JSON数据:');
        console.log(JSON.stringify(jsonData, null, 2));
        
        if (jsonData.success && jsonData.data) {
          console.log(`\n✓ API正常工作，返回了 ${jsonData.data.length} 道试题`);
          
          // 检查是否有审核通过的试题
          const approvedQuestions = jsonData.data.filter(q => q.status === 'approved');
          console.log(`✓ 其中审核通过的试题有 ${approvedQuestions.length} 道`);
          
          if (approvedQuestions.length > 0) {
            console.log('\n审核通过的试题示例:');
            console.log(JSON.stringify(approvedQuestions[0], null, 2));
          }
        }
      } catch (parseError) {
        console.log('响应不是有效的JSON格式');
      }
    } else {
      console.log('✗ API请求失败');
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testQuestionsAPI();