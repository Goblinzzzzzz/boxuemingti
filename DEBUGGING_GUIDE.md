# 生产环境调试指南

本文档介绍了为解决生产环境500错误而新增的调试功能和使用方法。

## 新增的调试接口

### 1. 错误诊断接口

#### `/api/health/debug`
详细的系统诊断接口，包含：
- 环境变量检查
- 数据库连接测试
- 依赖包验证（JWT、bcrypt、crypto）
- 内存和性能指标
- 请求信息

**使用方法：**
```bash
curl https://your-domain.vercel.app/api/health/debug
```

#### `/api/health/check`
简化的健康检查接口，快速验证系统状态。

**使用方法：**
```bash
curl https://your-domain.vercel.app/api/health/check
```

### 2. 日志查看器和请求追踪

#### `/api/logs/recent`
获取最近的请求日志（需要管理员权限）

**参数：**
- `limit`: 返回日志数量（默认20）
- `level`: 日志级别过滤（all, info, error, fatal）

**使用方法：**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/logs/recent?limit=50&level=error"
```

#### `/api/logs/trace/:requestId`
获取特定请求的追踪信息

**使用方法：**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/logs/trace/abc123"
```

#### `/api/logs/errors`
获取错误日志统计

**参数：**
- `hours`: 统计时间范围（默认24小时）

**使用方法：**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/logs/errors?hours=12"
```

#### `/api/logs/performance`
获取性能指标

**使用方法：**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/logs/performance"
```

### 3. 兼容性测试接口

#### `/api/compatibility/async`
测试异步操作兼容性

#### `/api/compatibility/jwt`
测试JWT库兼容性

#### `/api/compatibility/crypto`
测试加密库兼容性

#### `/api/compatibility/database`
测试数据库异步操作

#### `/api/compatibility/full`
运行所有兼容性测试

**使用方法：**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/compatibility/full"
```

## 增强的日志功能

### 请求追踪
每个请求现在都会分配一个唯一的请求ID，用于追踪整个请求生命周期：
- 请求开始时记录基本信息
- 请求结束时记录响应状态和耗时
- 错误发生时记录详细错误信息

### 全局错误处理
增强的全局错误处理器会：
- 生成唯一的错误ID
- 记录详细的错误上下文
- 将错误信息添加到日志追踪系统
- 根据错误类型返回适当的HTTP状态码

## 调试流程建议

### 1. 快速健康检查
```bash
# 检查系统基本状态
curl https://your-domain.vercel.app/api/health/check

# 详细诊断
curl https://your-domain.vercel.app/api/health/debug
```

### 2. 查看错误日志
```bash
# 获取最近的错误
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/logs/errors"

# 获取详细的错误日志
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/logs/recent?level=error&limit=20"
```

### 3. 兼容性测试
```bash
# 运行完整的兼容性测试
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/compatibility/full"
```

### 4. 请求追踪
如果有特定的错误请求ID，可以追踪该请求的完整生命周期：
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://your-domain.vercel.app/api/logs/trace/REQUEST_ID"
```

## 权限要求

- `/api/health/*` 接口：无需认证
- `/api/logs/*` 接口：需要管理员权限
- `/api/compatibility/*` 接口：需要管理员权限

## 注意事项

1. **日志存储**：当前日志存储在内存中，重启服务器会清空日志。生产环境建议集成外部日志服务。

2. **性能影响**：日志记录会有轻微的性能开销，但已经优化到最小。

3. **安全性**：敏感信息（如密码、完整的JWT token）不会记录在日志中。

4. **日志轮转**：内存中最多保存100条日志记录，超出会自动删除最旧的记录。

## 常见问题排查

### 500错误排查步骤

1. **检查环境变量**
   ```bash
   curl https://your-domain.vercel.app/api/health/debug
   ```
   查看 `checks.environmentVariables` 部分

2. **检查数据库连接**
   查看 `checks.databaseConnection` 部分

3. **检查依赖包**
   查看 `checks.dependencies` 部分

4. **查看最近错误**
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        "https://your-domain.vercel.app/api/logs/errors"
   ```

5. **运行兼容性测试**
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        "https://your-domain.vercel.app/api/compatibility/full"
   ```

### 登录问题排查

1. **检查JWT配置**
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        "https://your-domain.vercel.app/api/compatibility/jwt"
   ```

2. **检查加密库**
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        "https://your-domain.vercel.app/api/compatibility/crypto"
   ```

3. **查看认证相关错误**
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        "https://your-domain.vercel.app/api/logs/recent?limit=50" | grep -i auth
   ```

## 部署后验证

部署完成后，建议按以下顺序验证：

1. 基础健康检查
2. 详细诊断检查
3. 兼容性测试
4. 登录功能测试
5. 错误日志检查

这些调试工具将帮助快速定位和解决生产环境中的问题。