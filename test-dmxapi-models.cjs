/**
 * 测试DMXAPI的所有配置模型
 * 验证gpt-5-mini、gpt-4.1-mini、claude-3-sonnet、gemini-pro模型的可用性
 */

const https = require('https');
const { URL } = require('url');
require('dotenv').config();

// DMXAPI配置
const DMXAPI_CONFIG = {
  baseURL: 'https://www.dmxapi.cn/v1',
  apiKey: process.env.DMXAPI_API_KEY,
  models: [
    { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    { id: '