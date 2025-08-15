-- 修复用户权限配置
-- 添加缺失的权限并为普通用户分配正确的权限

-- 1. 添加缺失的questions.generate权限
INSERT INTO permissions (name, description, resource, action) VALUES
('questions.generate', 'AI生成试题', 'questions', 'generate')
ON CONFLICT (name) DO NOTHING;

-- 2. 为普通用户角色分配questions.generate权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user' AND p.name = 'questions.generate'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. 为普通用户角色分配questions.review权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user' AND p.name = 'questions.review'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. 确保管理员拥有所有权限（包括新添加的questions.generate）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin' AND p.name = 'questions.generate'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 验证权限分配
-- 查看普通用户权限
SELECT 
    r.name as role_name,
    p.name as permission_name,
    p.description as permission_description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'user'
ORDER BY p.name;