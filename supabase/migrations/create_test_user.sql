-- 创建测试用户
INSERT INTO users (email, password_hash, name, organization, email_verified, status)
VALUES (
  'zhaodan@ke.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 密码: password
  '赵丹',
  '科技公司',
  true,
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  organization = EXCLUDED.organization,
  email_verified = EXCLUDED.email_verified,
  status = EXCLUDED.status,
  updated_at = now();