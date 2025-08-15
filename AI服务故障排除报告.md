# AI服务故障排除报告

## 问题概述

**报告时间**: 2025年8月13日  
**问题描述**: 用户报告"AI服务当前不可用，将使用模拟数据生成试题"  
**解决状态**: ✅ 已解决

## 问题分析

### 根本原因
后端API服务未启动，导致前端无法访问AI服务状态接口，系统误判AI服务不可用。

### 具体表现
1. 前端显示"AI服务当前不可用"提示
2. 试题生成功能回退到模拟数据模式
3. 无法访问 `/api/generation/ai-status` 接口
4. 端口3003被占用，后端服务启动失败

## 解决过程

### 1. 问题诊断
- ✅ 检查AI服务配置：DMXAPI配置正确，API密钥有效
- ✅ 检查环境变量：所有必需的环境变量已正确设置
- ❌ 发现后端服务未运行：端口3003无响应
- ❌ 发现端口占用问题：旧进程占用端口3003

### 2. 解决步骤
1. **终止占用进程**
   ```bash
   lsof -i :3003  # 查找占用进程
   kill 84619     # 终止进程
   ```

2. **启动后端服务**
   ```bash
   npm run server:dev  # 启动后端API服务
   ```

3. **验证服务状态**
   ```bash
   curl http://localhost:3003/api/generation/ai-status
   ```

4. **测试AI生成功能**
   ```bash
   curl -X POST http://localhost:3003/api/generation/test-generate \
     -H "Content-Type: application/json" \
     -d '{"content":"测试内容","questionType":"单选题","difficulty":"易"}'
   ```

### 3. 验证结果
- ✅ 后端服务成功启动在端口3003
- ✅ AI状态接口返回正常：`{"available": true, "provider": "dmxapi"}`
- ✅ AI生成功能正常工作，成功生成高质量试题
- ✅ 质量评分达到0.95分

## 当前配置状态

### AI服务配置
```
AI_PROVIDER=dmxapi
DMXAPI_API_KEY=sk-mKzAgjMfW7Rl2rANjn4mhapAUS3OUH4gKeEjFWt7ngRQsQzM
DMXAPI_MODEL=gpt-4.1-mini
```

### 服务状态
- **前端服务**: ✅ 运行在 http://localhost:5173
- **后端服务**: ✅ 运行在 http://localhost:3003
- **AI服务**: ✅ DMXAPI正常工作
- **数据库**: ✅ Supabase连接正常

## 预防措施

### 1. 自动化诊断
创建了 `scripts/diagnose-ai-service.js` 诊断脚本，可以自动检测：
- 环境变量配置
- 配置文件完整性
- API服务状态
- AI生成功能

**使用方法**:
```bash
node scripts/diagnose-ai-service.js
```

### 2. 服务监控
建议添加以下监控机制：
- 定期检查端口占用情况
- 监控API服务健康状态
- 设置AI服务可用性告警

### 3. 启动脚本优化
当前使用 `concurrently` 同时启动前后端服务：
```bash
npm run dev  # 同时启动前端和后端
```

如果需要单独启动：
```bash
npm run client:dev  # 仅启动前端
npm run server:dev  # 仅启动后端
```

## 常见问题解决方案

### 问题1: "AI服务当前不可用"
**原因**: 后端服务未启动或AI配置错误  
**解决**: 
1. 检查后端服务: `curl http://localhost:3003/api/health`
2. 启动后端服务: `npm run server:dev`
3. 运行诊断脚本: `node scripts/diagnose-ai-service.js`

### 问题2: 端口被占用 (EADDRINUSE)
**原因**: 其他进程占用端口3003  
**解决**:
```bash
lsof -i :3003        # 查找占用进程
kill <PID>           # 终止进程
npm run server:dev   # 重新启动
```

### 问题3: API密钥无效
**原因**: DMXAPI密钥过期或配置错误  
**解决**:
1. 检查 `.env` 文件中的 `DMXAPI_API_KEY`
2. 访问 www.dmxapi.cn 获取新密钥
3. 重启后端服务使配置生效

### 问题4: 网络连接问题
**原因**: 无法访问DMXAPI服务  
**解决**:
1. 检查网络连接
2. 尝试切换到其他AI服务商（见备选方案）
3. 检查防火墙设置

## 备选AI服务商配置

如果DMXAPI出现问题，可以切换到以下服务商：

### 豆包 (推荐)
```env
AI_PROVIDER=doubao
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_MODEL=ep-20241230140648-8xzpz
```

### DeepSeek (性价比高)
```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
```

### OpenAI (备选)
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
```

## 相关文档

- [AI服务配置说明.md](./AI服务配置说明.md)
- [DMXAPI配置说明.md](./DMXAPI配置说明.md)
- [诊断脚本](./scripts/diagnose-ai-service.js)

## 联系支持

如果问题仍然存在，请：
1. 运行诊断脚本收集详细信息
2. 检查控制台错误日志
3. 提供环境变量配置（隐藏敏感信息）
4. 描述具体的错误现象和重现步骤

---

**报告生成**: 2025年8月13日  
**最后更新**: 2025年8月13日  
**状态**: AI服务已恢复正常运行