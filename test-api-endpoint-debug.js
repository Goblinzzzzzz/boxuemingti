#!/usr/bin/env node

/**
 * API端点调试脚本
 * 测试正确的文件上传API路径
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3003';
const TEST_USER = {
  email: 'zhaodan@ke.com',
  password: '123456'
};

async function testApiEndpoints() {
  console.log('=== API端点调试测试 ===\n');
  
  try {
    // 1. 健康检查
    console.log('1. 测试API健康状态...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`健康检查: ${healthResponse.status} - ${JSON.stringify(healthData)}\n`);
    
    if (!healthResponse.ok) {
      throw new Error('API服务不可用');
    }
    
    // 2. 用户登录获取token
    console.log('2. 用户登录...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const loginData = await loginResponse.json();
    console.log(`登录响应: ${loginResponse.status} - ${JSON.stringify(loginData)}\n`);
    
    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginData.error || loginData.message}`);
    }
    
    const token = loginData.data?.access_token || loginData.access_token;
    if (!token) {
      throw new Error('未获取到访问令牌');
    }
    
    console.log(`✅ 登录成功，获取到token: ${token.substring(0, 20)}...\n`);
    
    // 3. 测试不同的API端点
    const endpoints = [
      '/api/materials',
      '/api/materials/upload',
      '/api/materials/analyze'
    ];
    
    console.log('3. 测试API端点可用性...');
    for (const endpoint of endpoints) {
      try {
        const testResponse = await fetch(`${API_BASE}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`${endpoint}: ${testResponse.status} ${testResponse.statusText}`);
        
        if (testResponse.status !== 404) {
          const responseText = await testResponse.text();
          console.log(`  响应: ${responseText.substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`${endpoint}: 请求失败 - ${error.message}`);
      }
    }
    
    console.log('\n4. 测试文件上传到正确端点...');
    
    // 创建测试PDF文件
    const testPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF');
    
    // 测试正确的上传端点
    const formData = new FormData();
    formData.append('file', testPdfContent, {
      filename: 'test-document.pdf',
      contentType: 'application/pdf'
    });
    formData.append('title', 'API端点测试文档');
    
    const uploadResponse = await fetch(`${API_BASE}/api/materials/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    const uploadData = await uploadResponse.json();
    console.log(`\n文件上传到 /api/materials/upload:`);
    console.log(`状态: ${uploadResponse.status}`);
    console.log(`响应: ${JSON.stringify(uploadData, null, 2)}`);
    
    if (uploadResponse.ok) {
      console.log('\n✅ 文件上传成功！正确的端点是 /api/materials/upload');
    } else {
      console.log('\n❌ 文件上传失败');
      console.log(`错误详情: ${uploadData.error || uploadData.message}`);
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
  }
}

// 运行测试
testApiEndpoints().catch(console.error);