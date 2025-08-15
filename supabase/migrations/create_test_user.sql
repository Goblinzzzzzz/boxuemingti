-- 检查并创建测试用户 zhaodan@ke.com
-- 如果用户不存在，则创建该用户

-- 首先检查用户是否已存在
DO $$
BEGIN
    -- 如果用户不存在，则插入新用户
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'zhaodan@ke.com') THEN
        INSERT INTO users (
            email,
            password_hash,
            name,
            organization,
            email_verified,
            status,
            created_at,
            updated_at
        ) VALUES (
            'zhaodan@ke.com',
            '$2b$10$8K1p/a0dhtAXjD/X/YGVSO3RXSWHxkqX3gvfq1CoFnLegpLwZBvTW', -- bcrypt hash for '123456'
            '赵丹',
            'KE测试组织',
            true,
            'active',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '测试用户 zhaodan@ke.com 已创建';
    ELSE
        RAISE NOTICE '测试用户 zhaodan@ke.com 已存在';
    END IF;
END $$;

-- 验证用户是否存在
SELECT 
    id,
    email,
    name,
    organization,
    email_verified,
    status,
    created_at
FROM users 
WHERE email = 'zhaodan@ke.com';