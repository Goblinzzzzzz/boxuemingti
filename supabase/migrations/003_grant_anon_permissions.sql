-- 为anon和authenticated角色授予questions表的权限
-- 这样前端就可以正常访问已审核通过的试题

-- 授予anon角色对questions表的SELECT权限
GRANT SELECT ON questions TO anon;

-- 授予authenticated角色对questions表的完整权限
GRANT ALL PRIVILEGES ON questions TO authenticated;

-- 授予anon角色对knowledge_points表的SELECT权限
GRANT SELECT ON knowledge_points TO anon;

-- 授予authenticated角色对knowledge_points表的完整权限
GRANT ALL PRIVILEGES ON knowledge_points TO authenticated;

-- 检查当前权限设置
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated') 
    AND table_name IN ('questions', 'knowledge_points')
ORDER BY table_name, grantee;