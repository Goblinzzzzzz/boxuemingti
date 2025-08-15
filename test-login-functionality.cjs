const axios = require('axios');

// 测试登录功能
async function testLogin() {
  console.log('=== 测试用户登录功能 ===\n');
  
  const baseURL = 'http://localhost:3003';
  
  // 测试用户列表
  const testUsers = [
    {
      email: 'zhaodan@ke.com',
      password: '123456',
      description: '主要测试用户'
    },
    {
      email: 'zhaodab@ke.com', 
      password: '123456',
      description: '备用测试用户'
    }
  ];
  
  for (const user of testUsers) {
    console.log(`\n--- 测试用户: ${user.email} (${user.description}) ---`);
    
    try {
      const response = await axios.post(`${baseURL}/api/auth/login`, {
        email: user.email,
        password: user.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.success) {
        console.log('✅ 登录成功!');
        console.log(`   用户ID: ${response.data.user.id}`);
        console.log(`   用户名: ${response.data.user.name}`);
        console.log(`   邮箱: ${response.data.user.email}`);
        console.log(`   角色: ${response.data.user.roles.join(', ')}`);
        console.log(`   权限数量: ${response.data.user.permissions.length}`);
        console.log(`   Token长度: ${response.data.access_token.length} 字符`);
        
        // 测试Token验证
        try {
          const verifyResponse = await axios.get(`${baseURL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${response.data.access_token}`
            },
            timeout: 5000
          });
          
          if (verifyResponse.status === 200) {
            console.log('✅ Token验证成功!');
          } else {
            console.log('❌ Token验证失败');
          }
        } catch (verifyError) {
          console.log('❌ Token验证异常:', verifyError.response?.data?.message || verifyError.message);
        }
        
      } else {
        console.log('❌ 登录失败:', response.data.message);
      }
      
    } catch (error) {
      console.log('❌ 登录请求异常:');
      if (error.response) {
        console.log(`   状态码: ${error.response.status}`);
        console.log(`   错误信息: ${error.response.data.message || '未知错误'}`);
        if (error.response.data.error) {
          console.log(`   错误类型: ${error.response.data.error.type}`);
          console.log(`   详细信息: ${error.response.data.error.message}`);
        }
      } else if (error.request) {
        console.log('   网络连接错误 - 服务器可能未启动');
      } else {
        console.log(`   请求配置错误: ${error.message}`);
      }
    }
  }
  
  console.log('\n=== 登录功能测试完成 ===');
}

// 运行测试
testLogin().catch(console.error);