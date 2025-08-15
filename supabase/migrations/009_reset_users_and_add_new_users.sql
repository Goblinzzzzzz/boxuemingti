-- 清除数据库中的所有用户并添加新用户
-- 注意：这个脚本会删除所有现有用户数据

-- 1. 清除所有用户相关数据（按依赖关系顺序删除）

-- 删除系统日志中的用户引用
DELETE FROM system_logs WHERE user_id IS NOT NULL;

-- 删除生成任务中的用户引用
UPDATE generation_tasks SET created_by = NULL WHERE created_by IS NOT NULL;

-- 删除试题中的用户引用
UPDATE questions SET created_by = NULL WHERE created_by IS NOT NULL;

-- 删除素材中的用户引用
UPDATE materials SET created_by = NULL WHERE created_by IS NOT NULL;

-- 删除用户角色关联
DELETE FROM user_roles;

-- 删除所有用户
DELETE FROM users;

-- 2. 创建管理员用户 zhaodan@ke.com
INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    organization,
    email_verified,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'zhaodan@ke.com',
    '$2b$10$8K1p/a0dqailSX.LdL7wYeEFjmm9/zKZvpx5wHGlvQg4BYg3TQn3W', -- 密码: 123456
    '赵丹',
    '科技公司',
    true,
    'active',
    now(),
    now()
);

-- 3. 创建普通用户 tangx66@ke.com
INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    organization,
    email_verified,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'tangx66@ke.com',
    '$2b$10$8K1p/a0dqailSX.LdL7wYeEFjmm9/zKZvpx5wHGlvQg4BYg3TQn3W', -- 密码: 123456
    '唐显',
    '科技公司',
    true,
    'active',
    now(),
    now()
);

-- 4. 为 zhaodan@ke.com 分配管理员角色
INSERT INTO user_roles (
    id,
    user_id,
    role_id,
    assigned_at,
    assigned_by
)
SELECT 
    gen_random_uuid(),
    u.id,
    r.id,
    now(),
    u.id
FROM users u, roles r
WHERE u.email = 'zhaodan@ke.com' AND r.name = 'admin';

-- 5. 为 tangx66@ke.com 分配普通用户角色
INSERT INTO user_roles (
    id,
    user_id,
    role_id,
    assigned_at,
    assigned_by
)
SELECT 
    gen_random_uuid(),
    u.id,
    r.id,
    now(),
    (SELECT id FROM users WHERE email = 'zhaodan@ke.com')
FROM users u, roles r
WHERE u.email = 'tangx66@ke.com' AND r.name = 'user';

-- 6. 验证创建结果
SELECT 
    u.email,
    u.name,
    u.status,
    r.name as role_name,
    u.created_at
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
ORDER BY u.email;

-- 输出用户总数
SELECT COUNT(*) as total_users FROM users;