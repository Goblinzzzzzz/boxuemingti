-- 添加用户状态列
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 添加状态检查约束
ALTER TABLE users ADD CONSTRAINT check_user_status 
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending'));

-- 为现有用户设置默认状态
UPDATE users SET status = 'active' WHERE status IS NULL;

-- 设置status列为非空
ALTER TABLE users ALTER COLUMN status SET NOT NULL;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 添加注释
COMMENT ON COLUMN users.status IS '用户状态: active(活跃), inactive(非活跃), suspended(暂停), pending(待审核)';