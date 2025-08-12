# AI服务配置说明

## 概述

本项目支持三种AI服务提供商：
- **豆包** (字节跳动) - 推荐使用
- **DeepSeek** - 性价比高
- **OpenAI** - 可选

## 快速配置

### 1. 选择服务商

在 `.env` 文件中设置：
```bash
AI_PROVIDER=doubao  # 或 deepseek、openai
```

### 2. 配置API密钥

#### 豆包配置
1. 访问 [火山引擎控制台](https://console.volcengine.com/ark)
2. 注册账号并实名认证
3. 创建推理接入点，获取API Key和模型ID
4. 在 `.env` 文件中配置：
```bash
DOUBAO_API_KEY=your_api_key_here
DOUBAO_MODEL=your_model_id_here
```

#### DeepSeek配置
1. 访问 [DeepSeek平台](https://platform.deepseek.com)
2. 注册账号
3. 在API Keys页面创建新密钥
4. 在 `.env` 文件中配置：
```bash
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-chat
```

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

1. **选择合适的服务商**
   - 豆包：功能全面，中文支持好
   - DeepSeek：性价比高，适合大量使用

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