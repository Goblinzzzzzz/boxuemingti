# AI服务配置说明

## 概述

本项目使用 **DMXAPI** 作为唯一的AI服务提供商，支持多种先进的AI模型：
- **GPT-5 Mini** - 默认推荐模型
- **GPT-4o Mini** - 性能优异
- **GPT-4o** - 最新版本
- **Claude 3.5 Sonnet** - Anthropic模型
- **Gemini Pro** - Google模型

## 快速配置

### 1. 获取API密钥

1. 访问 [DMXAPI官网](https://www.dmxapi.com)
2. 注册账号并获取API密钥
3. 在 `.env` 文件中配置：
```bash
DMXAPI_API_KEY=your_api_key_here
DMXAPI_MODEL=gpt-5-mini
```

### 2. 可用模型列表

- `gpt-5-mini` - 默认模型，性能优异
- `gpt-4o-mini` - GPT-4o Mini模型
- `gpt-4o` - GPT-4o最新版本
- `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet
- `gemini-pro` - Gemini Pro模型

## 使用方法

### 基本用法

```typescript
import { aiService } from './api/services/aiService';

// 生成单个试题
const question = await aiService.generateQuestion({
  content: '教材内容...',
  questionType: '单选题',
  difficulty: '中',
  knowledgePoint: '人力资源规划'
});

// 批量生成试题
const questions = await aiService.generateBatchQuestions(
  {
    content: '教材内容...',
    questionType: '单选题',
    difficulty: '中'
  },
  5, // 生成5道题
  (progress) => console.log(`进度: ${progress}%`)
);
```

### 检查服务状态

```typescript
// 检查服务是否可用
if (aiService.isAvailable()) {
  console.log('AI服务已配置');
} else {
  console.log('AI服务未配置，将使用模拟数据');
}

// 获取详细状态
const status = aiService.getStatus();
console.log(status);
```

## 故障排除

### 常见问题

1. **提示"AI服务当前不可用"**
   - 检查 `.env` 文件中的API密钥是否正确配置
   - 确认API密钥有效且有足够余额
   - 检查网络连接

2. **生成的试题质量不佳**
   - 提供更详细的教材内容
   - 明确指定知识点
   - 调整难度等级

3. **API调用失败**
   - 检查API密钥格式
   - 确认服务商API服务正常
   - 查看控制台错误信息

### 模拟数据模式

当AI服务不可用时，系统会自动切换到模拟数据模式：
- 生成基础的人力资源管理试题
- 保证系统正常运行
- 在控制台显示配置提示

## 成本优化

1. **选择合适的模型**
   - gpt-5-mini：默认推荐，性价比高
   - gpt-4o-mini：性能优异，适合复杂任务
   - claude-3-5-sonnet：适合需要深度分析的场景

2. **控制调用频率**
   - 批量生成时自动添加延迟
   - 避免频繁调用API

3. **优化提示词**
   - 提供清晰的教材内容
   - 明确指定生成要求

## 技术支持

如果遇到问题，请：
1. 检查控制台错误信息
2. 确认配置文件格式正确
3. 查看服务商官方文档
4. 联系技术支持