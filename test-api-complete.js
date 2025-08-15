import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Supabase配置
const supabaseUrl = 'https://hnpqfqjqjqjqjqjqjqjq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucHFmcWpxanFqcWpxanFqcWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MjU0NzQsImV4cCI6MjA1MDAwMTQ3NH0.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteAPIFlow() {
  console.log('=== 完整API测试流程 ===\n');
  
  try {
    // 1. 登录获取token
    console.log('1. 登录测试...');
    const loginResponse = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'zhaodan@ke.com',
        password: '123456'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('登录响应:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.success || !loginData.access_token) {
      throw new Error('登录失败或未获取到token');
    }
    
    const token = loginData.access_token;
    console.log('✅ 登录成功，获取到token\n');
    
    // 2. 测试/api/questions接口
    console.log('2. 测试 /api/questions 接口...');
    const questionsResponse = await fetch('http://localhost:3003/api/questions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const questionsData = await questionsResponse.json();
    console.log('Questions API响应状态:', questionsResponse.status);
    console.log('Questions API响应:', JSON.stringify(questionsData, null, 2));
    
    if (questionsData.success && questionsData.data?.questions) {
      console.log(`✅ API调用成功，返回 ${questionsData.data.questions.length} 道试题`);
      
      if (questionsData.data.questions.length > 0) {
        console.log('\n试题列表:');
        questionsData.data.questions.forEach((q, index) => {
          console.log(`${index + 1}. ID: ${q.id}`);
          console.log(`   题干: ${q.stem?.substring(0, 50)}...`);
          console.log(`   状态: ${q.status}`);
          console.log(`   难度: ${q.difficulty}`);
          console.log(`   任务ID: ${q.task_id}`);
          console.log('---');
        });
      }
    } else {
      console.log('❌ API调用失败或返回空列表');
    }
    
    // 3. 测试/api/questions/stats接口
    console.log('\n3. 测试 /api/questions/stats 接口...');
    const statsResponse = await fetch('http://localhost:3003/api/questions/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const statsData = await statsResponse.json();
    console.log('Stats API响应状态:', statsResponse.status);
    console.log('Stats API响应:', JSON.stringify(statsData, null, 2));
    
    // 4. 直接查询数据库验证
    console.log('\n4. 直接查询数据库验证...');
    
    // 获取用户ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'zhaodan@ke.com')
      .single();
    
    if (userData) {
      console.log('用户ID:', userData.id);
      
      // 查询该用户的审核通过试题
      const { data: dbQuestions, error } = await supabase
        .from('questions')
        .select(`
          id, stem, status, difficulty, task_id,
          generation_tasks!inner(created_by)
        `)
        .eq('status', 'approved')
        .eq('generation_tasks.created_by', userData.id);
      
      if (error) {
        console.log('数据库查询错误:', error);
      } else {
        console.log(`数据库直接查询结果: ${dbQuestions?.length || 0} 道试题`);
        
        if (dbQuestions && dbQuestions.length > 0) {
          console.log('\n数据库中的试题:');
          dbQuestions.forEach((q, index) => {
            console.log(`${index + 1}. ID: ${q.id}`);
            console.log(`   题干: ${q.stem?.substring(0, 50)}...`);
            console.log(`   状态: ${q.status}`);
            console.log(`   任务ID: ${q.task_id}`);
            console.log('---');
          });
        }
      }
    }
    
    // 5. 比较API和数据库结果
    console.log('\n5. 结果对比分析:');
    const apiCount = questionsData.success ? questionsData.data?.questions?.length || 0 : 0;
    const dbCount = dbQuestions?.length || 0;
    
    console.log(`API返回试题数量: ${apiCount}`);
    console.log(`数据库查询试题数量: ${dbCount}`);
    
    if (apiCount === dbCount && dbCount > 0) {
      console.log('✅ API和数据库结果一致，接口正常');
    } else if (dbCount > 0 && apiCount === 0) {
      console.log('❌ 数据库有数据但API返回空，可能是接口逻辑问题');
    } else if (dbCount === 0) {
      console.log('⚠️  数据库中没有符合条件的试题数据');
    } else {
      console.log('❌ API和数据库结果不一致');
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

testCompleteAPIFlow();