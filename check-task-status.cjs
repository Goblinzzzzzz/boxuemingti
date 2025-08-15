/**
 * 检查任务状态脚本
 * 用于诊断任务超时的具体原因
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003';
const TEST_EMAIL = 'zhaodab@ke.com';
const TEST_PASSWORD = '123456';

class TaskStatusChecker {
  constructor() {
    this.authToken = null;
  }

  async login() {
    try {
      console.log('🔐 登录测试账号...');
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      
      if (response.data.success && response.data.access_token) {
        this.authToken = response.data.access_token;
        console.log('✅ 登录成功');
        return true;
      } else {
        console.error('❌ 登录失败:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ 登录请求失败:', error.response?.data || error.message);
      return false;
    }
  }

  async checkRecentTasks() {
    try {
      console.log('\n📋 检查最近的任务...');
      const response = await axios.get(
        `${BASE_URL}/api/generation/tasks`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );
      
      if (response.data.success) {
        const tasks = response.data.data;
        console.log(`找到 ${tasks.length} 个任务`);
        
        // 显示最近5个任务的状态
        const recentTasks = tasks.slice(0, 5);
        for (const task of recentTasks) {
          console.log(`\n📝 任务 ${task.id}:`);
          console.log(`   状态: ${task.status}`);
          console.log(`   创建时间: ${task.created_at}`);
          console.log(`   更新时间: ${task.updated_at}`);
          console.log(`   参数: ${JSON.stringify(task.parameters, null, 2)}`);
          
          if (task.result) {
            console.log(`   结果: ${JSON.stringify(task.result, null, 2)}`);
          }
          
          // 如果任务失败或卡住，获取详细信息
          if (task.status === 'failed' || task.status === 'pending') {
            await this.getTaskDetails(task.id);
          }
        }
      } else {
        console.error('❌ 获取任务列表失败:', response.data);
      }
    } catch (error) {
      console.error('❌ 检查任务失败:', error.response?.data || error.message);
    }
  }

  async getTaskDetails(taskId) {
    try {
      console.log(`\n🔍 获取任务 ${taskId} 的详细信息...`);
      const response = await axios.get(
        `${BASE_URL}/api/generation/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );
      
      if (response.data.success) {
        const task = response.data.data;
        console.log(`   详细状态: ${task.status}`);
        console.log(`   进度: ${task.parameters?.progress || 0}%`);
        
        if (task.result?.error) {
          console.log(`   错误信息: ${task.result.error}`);
        }
        
        if (task.result?.details) {
          console.log(`   详细信息: ${JSON.stringify(task.result.details, null, 2)}`);
        }
      }
    } catch (error) {
      console.error(`❌ 获取任务详情失败:`, error.response?.data || error.message);
    }
  }

  async checkAIServiceStatus() {
    try {
      console.log('\n🤖 检查AI服务状态...');
      const response = await axios.get(
        `${BASE_URL}/api/generation/ai-status`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );
      
      if (response.data.success) {
        const status = response.data.data;
        console.log('✅ AI服务状态:');
        console.log(`   可用性: ${status.available ? '可用' : '不可用'}`);
        console.log(`   提供商: ${status.provider}`);
        console.log(`   模型: ${status.model}`);
        console.log(`   API密钥: ${status.hasApiKey ? '已配置' : '未配置'}`);
        
        if (status.message) {
          console.log(`   消息: ${status.message}`);
        }
      } else {
        console.error('❌ AI服务状态检查失败:', response.data);
      }
    } catch (error) {
      console.error('❌ AI服务状态请求失败:', error.response?.data || error.message);
    }
  }

  async checkDMXAPIConnection() {
    try {
      console.log('\n🔗 检查DMXAPI连接...');
      const response = await axios.get(
        `${BASE_URL}/api/ai/test-connection`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );
      
      if (response.data.success) {
        console.log('✅ DMXAPI连接正常');
        console.log(`   响应: ${JSON.stringify(response.data.data, null, 2)}`);
      } else {
        console.error('❌ DMXAPI连接失败:', response.data);
      }
    } catch (error) {
      console.error('❌ DMXAPI连接测试失败:', error.response?.data || error.message);
    }
  }

  async run() {
    console.log('🚀 开始任务状态诊断');
    console.log('=' .repeat(50));
    
    // 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ 登录失败，诊断终止');
      return;
    }
    
    // 检查AI服务状态
    await this.checkAIServiceStatus();
    
    // 检查DMXAPI连接
    await this.checkDMXAPIConnection();
    
    // 检查最近的任务
    await this.checkRecentTasks();
    
    console.log('\n✅ 诊断完成');
  }
}

// 运行诊断
const checker = new TaskStatusChecker();
checker.run().catch(console.error);