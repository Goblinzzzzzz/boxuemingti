# 超级管理员配置指南

本指南说明如何将 `zhaodan@ke.com` 账号配置为系统超级管理员。

## 方法一：使用 Node.js 脚本（推荐）

### 前提条件
1. 确保已安装 Node.js 和 npm
2. 确保项目依赖已安装：`npm install`
3. 确保 `.env` 文件中配置了 Supabase 连接信息

### 配置 .env 文件
确保 `.env` 文件包含以下配置：
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 安装额外依赖
```bash
npm install bcrypt @supabase/supabase-js
```

### 执行脚本
```bash
node setup-admin.js
```

### 脚本功能
- 自动检查用户是否存在
- 如果用户不存在，创建新用户
- 为用户分配 admin 角色
- 验证配置结果
- 显示登录信息

## 方法二：使用 SQL 脚本

### 前提条件
1. 有数据库的直接访问权限
2. 可以使用 psql 或其他 PostgreSQL 客户端

### 执行步骤

#### 使用 psql 命令行
```bash
psql -h your_host -p your_port -U your_username -d your_database -f setup-admin.sql
```

#### 或者在 psql 交互模式中
```sql
\i setup-admin.sql
```

### 注意事项
⚠️ **重要**：SQL 脚本中的密码哈希值是示例值，实际使用时需要：
1. 生成真实的 bcrypt 哈希值
2. 替换脚本中的 `admin_password_hash` 变量

生成密码哈希的方法：
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('your_password', 10);
console.log(hash);
```

## 方法三：通过 Supabase 控制台

### 步骤
1. 登录 Supabase 控制台
2. 进入 Table Editor
3. 手动操作以下表：

#### 3.1 在 users 表中创建用户
```sql
INSERT INTO users (email, name, password_hash, organization, email_verified)
VALUES (
    'zhaodan@ke.com',
    '赵丹',
    '$2b$10$your_bcrypt_hash_here',
    'HR搏学',
    true
);
```

#### 3.2 在 user_roles 表中分配角色
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT 
    u.id,
    r.id
FROM users u, roles r
WHERE u.email = 'zhaodan@ke.com' AND r.name = 'admin';
```

## 验证配置

配置完成后，可以通过以下方式验证：

### 1. 查询用户角色
```sql
SELECT 
    u.email,
    u.name,
    array_agg(r.name) as roles
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'zhaodan@ke.com'
GROUP BY u.email, u.name;
```

### 2. 测试登录
1. 访问：http://localhost:5176/login
2. 使用邮箱：`zhaodan@ke.com`
3. 使用密码：`admin123456`（默认密码）

### 3. 验证权限
登录后应该能够访问所有功能模块：
- 工作台
- 教材输入
- AI生成工作台
- 试题审核
- 题库管理

## 安全建议

1. **立即修改密码**：首次登录后立即修改默认密码
2. **启用双因素认证**：如果系统支持，建议启用 2FA
3. **定期审核权限**：定期检查管理员账号的使用情况
4. **备份配置**：保存好配置脚本，以备将来使用

## 故障排除

### 常见问题

1. **连接数据库失败**
   - 检查 `.env` 文件配置
   - 确认 Supabase 项目状态
   - 验证网络连接

2. **用户已存在但没有权限**
   - 检查 user_roles 表中的角色分配
   - 确认 roles 表中存在 'admin' 角色

3. **密码验证失败**
   - 确认密码哈希算法正确（bcrypt）
   - 检查哈希值格式

4. **权限不足**
   - 确认使用的是 SERVICE_ROLE_KEY 而不是 ANON_KEY
   - 检查数据库 RLS 策略

### 获取帮助

如果遇到问题，请检查：
1. 控制台错误信息
2. 数据库日志
3. Supabase 控制台的 Logs 页面

## 默认账号信息

配置完成后的默认账号信息：
- **邮箱**：zhaodan@ke.com
- **姓名**：赵丹
- **密码**：admin123456
- **角色**：admin（超级管理员）
- **组织**：HR搏学

⚠️ **请在首次登录后立即修改密码！**