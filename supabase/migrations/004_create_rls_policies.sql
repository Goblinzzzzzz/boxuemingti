-- 创建RLS策略以允许匿名用户访问已审核通过的试题

-- 为questions表创建RLS策略
-- 允许匿名用户查看已审核通过的试题
CREATE POLICY "Allow anon to read approved questions" ON questions
    FOR SELECT
    TO anon
    USING (status = 'approved');

-- 允许已认证用户查看所有试题
CREATE POLICY "Allow authenticated to read all questions" ON questions
    FOR SELECT
    TO authenticated
    USING (true);

-- 允许已认证用户修改试题
CREATE POLICY "Allow authenticated to modify questions" ON questions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 为knowledge_points表创建RLS策略
-- 允许匿名用户查看所有知识点
CREATE POLICY "Allow anon to read knowledge_points" ON knowledge_points
    FOR SELECT
    TO anon
    USING (true);

-- 允许已认证用户完全访问知识点
CREATE POLICY "Allow authenticated full access to knowledge_points" ON knowledge_points
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 检查创建的策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('questions', 'knowledge_points')
ORDER BY tablename, policyname;