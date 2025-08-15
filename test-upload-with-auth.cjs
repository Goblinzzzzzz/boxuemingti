const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

// 测试带认证的文件上传
async function testUploadWithAuth() {
  console.log('🧪 开始测试带认证的文件上传...');
  
  try {
    const baseUrl = 'http://localhost:3003';
    
    // 首先尝试登录获取token（如果有登录接口）
    console.log('\n🔐 尝试获取认证token...');
    
    // 创建一个简单的测试用户登录请求
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    console.log('📥 登录响应状态:', loginResponse.status, loginResponse.statusText);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ 登录成功，获取到token');
      
      // 使用token上传文件
      const token = loginData.token || loginData.access_token;
      
      console.log('\n📄 测试文本文件上传...');
      const form = new FormData();
      const fileBuffer = fs.readFileSync('./better-test.txt');
      form.append('file', fileBuffer, {
        filename: 'better-test.txt',
        contentType: 'text/plain'
      });
      form.append('title', '测试文本文档');
      
      const uploadResponse = await fetch(`${baseUrl}/api/materials/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });
      
      console.log('📥 上传响应状态:', uploadResponse.status, uploadResponse.statusText);
      
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        console.log('✅ 文件上传成功!');
        console.log('📄 上传结果:', uploadData);
      } else {
        const errorData = await uploadResponse.json();
        console.log('❌ 文件上传失败');
        console.log('📄 错误信息:', errorData);
      }
    } else {
      console.log('❌ 登录失败，尝试直接测试上传接口结构');
      
      // 直接测试上传接口，看看具体的认证要求
      console.log('\n📄 测试上传接口结构...');
      const form = new FormData();
      const fileBuffer = fs.readFileSync('./better-test.txt');
      form.append('file', fileBuffer, {
        filename: 'better-test.txt',
        contentType: 'text/plain'
      });
      form.append('title', '测试文本文档');
      
      const uploadResponse = await fetch(`${baseUrl}/api/materials/upload`, {
        method: 'POST',
        body: form
      });
      
      console.log('📥 上传响应状态:', uploadResponse.status, uploadResponse.statusText);
      const responseData = await uploadResponse.json();
      console.log('📄 响应数据:', responseData);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
  
  console.log('\n🏁 认证上传测试完成');
}

testUploadWithAuth();