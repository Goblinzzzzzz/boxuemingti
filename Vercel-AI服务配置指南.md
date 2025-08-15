# Vercel AI服务配置指南

## 概述

本指南帮助您在Vercel生产环境中正确配置DMXAPI AI服务，解决"AI离线服务不可用"的问题。

## 🚨 问题症状

- 生产环境显示"AI服务当前不可用，将使用模拟数据生成试题"
- 本地开发环境AI服务正常，但部署到Vercel后失效
- AI生成接口返回模拟数据而非真实AI响应

## 🔧 解决方案

### 步骤1：检查本地配置

首先确保本地环境配置正确：

```bash
# 检查本地AI服务状态
node scripts/verify-vercel-env.js
```

### 步骤2：生成Vercel环境变量配置

运行配置助手生成所需的Vercel CLI命令：

```bash
# 生成Vercel环境变量配置命令
node scripts/setup-vercel-env.js
```

### 步骤3：设置Vercel环境变量

#### 方法1：使用Vercel CLI（推荐）

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录Vercel
vercel login

# 3. 链接项目
vercel link

# 4. 设置环境变量（根据setup-vercel-env.js输出的命令）
vercel env add DMXAPI_API_KEY production
vercel env add DMXAPI_MODEL production
# ... 其他环境变量

# 5. 重新部署
vercel --prod
```

#### 方法2：使用Vercel Dashboard

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的项目
3. 进入 Settings → Environment Variables
4. 添加以下环境变量：

| 变量名 | 值 | 环境 |
|--------|----|---------|
| `DMXAPI_API_KEY` | `sk-your-api-key` | Production, Preview, Development |
| `DMXAPI_MODEL` | `gpt-5-mini` | Production, Preview, Development |
| `SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | `your-anon-key` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | Production, Preview, Development |
| `JWT_SECRET` | `your-jwt-secret` | Production, Preview, Development |

### 步骤4：验证配置

```bash
# 验证环境变量是否正确传递
node scripts/verify-vercel-env.js
```

或访问生产环境的调试接口：
- `https://your-app.vercel.app/api/env-check`
- `https://your-app.vercel.app/api/generation/ai-status`

## 🔍 故障排除

### 问题1：环境变量未传递到生产环境

**症状**：本地正常，生产环境显示环境变量未定义

**解决方案**：
1. 检查 `vercel.json` 配置是否包含所有必要的环境变量
2. 确保环境变量名称完全匹配（区分大小写）
3. 重新部署项目触发环境变量更新

### 问题2：API密钥格式错误

**症状**：环境变量存在但AI服务仍不可用

**解决方案**：
1. 检查DMXAPI密钥格式：应以 `sk-` 开头
2. 确认API密钥有效且有足够余额
3. 检查API密钥权限设置

### 问题3：模型配置错误

**症状**：API密钥正确但模型无法使用

**解决方案**：
1. 确认 `DMXAPI_MODEL` 设置为支持的模型：
   - `gpt-5-mini` (推荐)
   - `gpt-4o-mini`
   - `gpt-4o`
   - `claude-3-5-sonnet-20241022`
   - `gemini-pro`
2. 检查模型是否在您的API密钥权限范围内

### 问题4：Vercel函数超时

**症状**：AI请求超时或函数执行时间过长

**解决方案**：
1. 检查 `vercel.json` 中的函数配置：
   ```json
   {
     "functions": {
       "api/**/*.ts": {
         "maxDuration": 30,
         "memory": 1024
       }
     }
   }
   ```
2. 优化AI请求参数，减少响应时间
3. 考虑使用异步处理长时间的AI任务

## 📊 监控和调试

### 实时监控

使用以下接口监控AI服务状态：

```bash
# 检查环境变量状态
curl https://your-app.vercel.app/api/env-check

# 检查AI服务状态
curl https://your-app.vercel.app/api/generation/ai-status

# 测试AI生成功能
curl -X POST https://your-app.vercel.app/api/generation/test-generate \
  -H "Content-Type: application/json" \
  -d '{"content":"测试内容","questionType":"单选题","difficulty":"易"}'
```

### 日志查看

在Vercel Dashboard中查看函数日志：
1. 进入项目 → Functions 标签
2. 点击具体的函数查看执行日志
3. 查找AI服务相关的错误信息

## 🚀 最佳实践

### 1. 环境变量管理

- 使用相同的环境变量名称在所有环境中
- 定期轮换API密钥
- 不要在代码中硬编码敏感信息

### 2. 部署策略

- 先在Preview环境测试配置
- 确认无误后再部署到Production
- 保持本地和生产环境配置同步

### 3. 监控和告警

- 定期检查AI服务状态
- 设置API使用量监控
- 配置余额不足告警

## 📝 配置检查清单

在部署前，请确认以下项目：

- [ ] 本地 `.env` 文件配置正确
- [ ] `vercel.json` 包含所有必要的环境变量
- [ ] Vercel Dashboard中设置了所有环境变量
- [ ] DMXAPI密钥格式正确且有效
- [ ] DMXAPI模型配置正确
- [ ] 函数超时和内存配置合适
- [ ] 重新部署触发配置更新
- [ ] 验证生产环境AI服务可用

## 🆘 紧急恢复

如果当前DMXAPI模型不可用，可以临时切换到其他DMXAPI模型：

```bash
# 切换到gpt-4o-mini
vercel env add DMXAPI_MODEL gpt-4o-mini production
vercel --prod

# 或切换到claude-3-5-sonnet
vercel env add DMXAPI_MODEL claude-3-5-sonnet-20241022 production
vercel --prod

# 或切换到gemini-pro
vercel env add DMXAPI_MODEL gemini-pro production
vercel --prod
```

## 📞 技术支持

如果问题仍然存在，请：

1. 运行完整的诊断报告：`node scripts/verify-vercel-env.js`
2. 收集Vercel函数日志
3. 检查API服务商的状态页面
4. 联系相应的技术支持

---

**最后更新**：{new Date().toISOString()}
**版本**：1.0.0