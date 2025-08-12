-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name VARCHAR(255) NOT NULL DEFAULT '明题智能题库系统',
  site_description TEXT DEFAULT '基于AI的智能题库管理系统',
  max_file_size INTEGER DEFAULT 10, -- MB
  allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt'],
  enable_registration BOOLEAN DEFAULT true,
  enable_email_verification BOOLEAN DEFAULT false,
  session_timeout INTEGER DEFAULT 24, -- hours
  max_login_attempts INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error', 'debug')),
  action VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);

-- 启用行级安全策略
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 系统配置表的RLS策略 - 只有管理员可以访问
CREATE POLICY "Admin can manage system config" ON system_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- 系统日志表的RLS策略 - 只有管理员可以查看
CREATE POLICY "Admin can view system logs" ON system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- 系统日志表的RLS策略 - 只有管理员可以删除
CREATE POLICY "Admin can delete system logs" ON system_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- 系统可以插入日志（用于系统自动记录）
CREATE POLICY "System can insert logs" ON system_logs
  FOR INSERT WITH CHECK (true);

-- 授权给anon和authenticated角色（通过RLS策略控制访问）
GRANT SELECT, INSERT, UPDATE, DELETE ON system_config TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON system_logs TO anon, authenticated;

-- 插入默认系统配置
INSERT INTO system_config (
  site_name,
  site_description,
  max_file_size,
  allowed_file_types,
  enable_registration,
  enable_email_verification,
  session_timeout,
  max_login_attempts
) VALUES (
  '明题智能题库系统',
  '基于AI的智能题库管理系统',
  10,
  ARRAY['pdf', 'doc', 'docx', 'txt'],
  true,
  false,
  24,
  5
) ON CONFLICT DO NOTHING;

-- 插入一些示例系统日志
INSERT INTO system_logs (level, action, details) VALUES
  ('info', '系统启动', '系统成功启动并初始化'),
  ('info', '数据库迁移', '成功执行数据库迁移脚本'),
  ('info', '系统配置', '系统配置表创建完成')
ON CONFLICT DO NOTHING;