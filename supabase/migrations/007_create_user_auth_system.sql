-- 创建用户权限管理系统的数据库表结构
-- 包括用户表、角色表、权限表和关联表

-- 创建用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    organization VARCHAR(200),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 创建用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 创建角色表
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建权限表
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL
);

-- 创建用户角色关联表
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- 创建用户角色关联表索引
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- 创建角色权限关联表
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- 插入系统默认角色
INSERT INTO roles (name, description, is_system_role) VALUES
('user', '普通用户', TRUE),
('reviewer', '审核员', TRUE),
('admin', '系统管理员', TRUE);

-- 插入系统权限
INSERT INTO permissions (name, description, resource, action) VALUES
('materials.create', '创建教材', 'materials', 'create'),
('materials.read', '查看教材', 'materials', 'read'),
('materials.update', '编辑教材', 'materials', 'update'),
('materials.delete', '删除教材', 'materials', 'delete'),
('questions.create', '创建试题', 'questions', 'create'),
('questions.read', '查看试题', 'questions', 'read'),
('questions.update', '编辑试题', 'questions', 'update'),
('questions.delete', '删除试题', 'questions', 'delete'),
('questions.review', '审核试题', 'questions', 'review'),
('users.manage', '管理用户', 'users', 'manage'),
('system.admin', '系统管理', 'system', 'admin');

-- 为默认角色分配权限
-- 普通用户权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user' AND p.name IN (
    'materials.create', 'materials.read', 'materials.update', 'materials.delete',
    'questions.create', 'questions.read', 'questions.update', 'questions.delete'
);

-- 审核员权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'reviewer' AND p.name IN (
    'materials.read', 'questions.read', 'questions.review'
);

-- 管理员权限（所有权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin';

-- 启用用户表的行级安全策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的信息
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 管理员可以查看所有用户
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    ));

-- 管理员可以更新所有用户
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    ));

-- 允许用户注册（插入新用户）
CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);

-- 创建用户认证函数
CREATE OR REPLACE FUNCTION authenticate_user(p_email TEXT, p_password TEXT)
RETURNS TABLE(user_id UUID, user_name TEXT, user_email TEXT, user_organization TEXT, user_roles TEXT[]) AS $$
DECLARE
    stored_password_hash TEXT;
    user_record RECORD;
BEGIN
    -- 查找用户
    SELECT id, name, email, organization, password_hash INTO user_record
    FROM users 
    WHERE email = p_email;
    
    -- 如果用户不存在
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- 验证密码（这里简化处理，实际应该使用bcrypt）
    IF user_record.password_hash = crypt(p_password, user_record.password_hash) THEN
        -- 更新最后登录时间
        UPDATE users SET last_login_at = NOW() WHERE id = user_record.id;
        
        -- 返回用户信息和角色
        RETURN QUERY
        SELECT 
            user_record.id,
            user_record.name,
            user_record.email,
            user_record.organization,
            ARRAY(
                SELECT r.name 
                FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = user_record.id
            );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建获取用户权限的函数
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT p.name
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建检查用户权限的函数
CREATE OR REPLACE FUNCTION check_user_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_uuid AND p.name = permission_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器函数：自动为新用户分配默认角色
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
    -- 为新用户分配普通用户角色
    INSERT INTO user_roles (user_id, role_id)
    SELECT NEW.id, r.id
    FROM roles r
    WHERE r.name = 'user';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：用户注册后自动分配角色
CREATE TRIGGER assign_default_role_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION assign_default_role();

-- 创建更新用户最后修改时间的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：更新用户信息时自动更新时间戳
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();