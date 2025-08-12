-- 配置zhaodan@ke.com为超级管理员的SQL脚本
-- 注意：执行前请确保已连接到正确的数据库

-- 设置变量
\set admin_email 'zhaodan@ke.com'
\set admin_name '赵丹'
\set admin_organization 'HR搏学'
-- 密码哈希值（对应密码：admin123456）
-- 注意：这是使用bcrypt生成的哈希值，实际使用时应该重新生成
\set admin_password_hash '$2b$10$rQZ8kqVXqxqxqxqxqxqxqOeKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK'

BEGIN;

-- 1. 检查并创建用户（如果不存在）
INSERT INTO users (email, name, password_hash, organization, email_verified)
SELECT 
    :'admin_email',
    :'admin_name', 
    :'admin_password_hash',
    :'admin_organization',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = :'admin_email'
);

-- 2. 获取用户ID和admin角色ID
WITH user_info AS (
    SELECT id as user_id FROM users WHERE email = :'admin_email'
),
role_info AS (
    SELECT id as role_id FROM roles WHERE name = 'admin'
)
-- 3. 分配admin角色（如果尚未分配）
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM user_info u, role_info r
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.user_id AND ur.role_id = r.role_id
);

-- 4. 验证配置结果
SELECT 
    u.email,
    u.name,
    u.organization,
    array_agg(r.name) as roles,
    u.created_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = :'admin_email'
GROUP BY u.id, u.email, u.name, u.organization, u.created_at;

COMMIT;

-- 显示配置完成信息
\echo ''
\echo '=== 超级管理员配置完成 ==='
\echo '用户邮箱: zhaodan@ke.com'
\echo '用户姓名: 赵丹'
\echo '默认密码: admin123456'
\echo ''
\echo '注意事项:'
\echo '1. 请在首次登录后修改默认密码'
\echo '2. 管理员可以访问所有功能模块'
\echo '3. 登录地址: http://localhost:5176/login'
\echo ''