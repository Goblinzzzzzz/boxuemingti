# DMXAPI 第三方模型配置说明

## 概述

DMXAPI 是一个统一的AI模型接口服务，支持调用多种主流AI模型，包括：
- Claude (Anthropic)
- Gemini (Google)
- Doubao (字节跳动)
- Qwen (阿里巴巴)
- 等其他模型

所有模型都使用统一的OpenAI格式进行调用，简化了集成过程。

## 配置步骤

### 1. 获取API密钥
- 访问：`www.dmxapi.cn`
- 注册账号并获取API密钥

### 2. 配置环境变量
在 `.env` 文件中设置以下配置：

```bash
# 选择AI服务提供商
AI_PROVIDER=dmxapi

# DMXAPI配置
DMXAPI_API_KEY=你的真实API密钥
DMXAPI_MODEL=claude  # 可选：claude, gemini, doubao, qwen等
```

### 3. 支持的模型

| 模型名称 | 说明 | 推荐用途 |
|---------|------|---------|
| `claude` | Anthropic Claude | 文本理解、推理能力强 |
| `gemini` | Google Gemini | 多模态能力、创新性强 |
| `doubao` | 字节跳动豆包 | 中文理解优秀 |
| `qwen` | 阿里巴巴通义千问 | 中文处理、逻辑推理 |

## 使用示例

### Python示例（参考）
```python
import openai

# 配置API
openai.api_key = "你的API密钥"
openai.api_base = "https://www.dmxapi.cn"

# 调用Claude模型
response = openai.ChatCompletion.create(
    model="claude",
    messages=[
        {"role": "user", "content": "你好"}
    ]
)

print(response.choices[0].message.content)
```

### 系统集成
本系统已经集成了DMXAPI支持，只需要：

1. 设置 `AI_PROVIDER=dmxapi`
2. 配置 `DMXAPI_API_KEY`
3. 选择合适的 `DMXAPI_MODEL`

## 切换模型

如果需要切换到不同的模型，只需修改 `.env` 文件中的 `DMXAPI_MODEL` 值：

```bash
# 使用Claude
DMXAPI_MODEL=claude

# 使用Gemini
DMXAPI_MODEL=gemini

# 使用豆包
DMXAPI_MODEL=doubao

# 使用通义千问
DMXAPI_MODEL=qwen
```

修改后重启服务即可生效。

## 注意事项

1. **API密钥安全**：请妥善保管您的API密钥，不要提交到代码仓库
2. **模型选择**：不同模型有不同的特点，建议根据具体需求选择
3. **费用控制**：请关注API调用费用，合理使用
4. **错误处理**：系统已内置错误处理，API调用失败时会自动使用模拟数据

## 故障排除

### 常见问题

1. **API密钥无效**
   - 检查密钥是否正确
   - 确认账号是否有足够余额

2. **模型不支持**
   - 检查模型名称是否正确
   - 确认该模型是否在您的账号权限内

3. **网络连接问题**
   - 检查网络连接
   - 确认防火墙设置

### 调试方法

查看服务器日志，系统会输出详细的API调用信息：
```bash
npm run server:dev
```

日志中会显示：
- API请求URL
- 请求参数
- 响应状态
- 错误信息（如有）

## 技术支持

如有问题，请：
1. 查看系统日志
2. 检查网络连接
3. 验证API密钥
4. 联系DMXAPI技术支持