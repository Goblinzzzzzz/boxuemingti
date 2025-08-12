-- 为现有表添加 created_by 字段
-- 这个迁移文件专门处理添加 created_by 字段和基本的 RLS 策略

-- 1. 为 materials 表添加 created_by 字段
ALTER TABLE materials ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);

-- 2. 为 questions 表添加 created_by 字段
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);

-- 3. 为 generation_tasks 表添加 created_by 字段
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_created_by ON generation_tasks(created_by);

-- 4. 启用 RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_tasks ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略

-- Materials 表的 RLS 策略
CREATE POLICY "Users can view their own materials" ON materials
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own materials" ON materials
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own materials" ON materials
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own materials" ON materials
    FOR DELETE USING (created_by = auth.uid());

-- Admins can view all materials
CREATE POLICY "Admins can view all materials" ON materials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

-- Questions 表的 RLS 策略
CREATE POLICY "Users can view their own questions" ON questions
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own questions" ON questions
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own questions" ON questions
    FOR UPDATE USING (created_by = auth.uid());

-- Reviewers can view pending questions
CREATE POLICY "Reviewers can view pending questions" ON questions
    FOR SELECT USING (
        status IN ('pending', 'ai_approved') AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('reviewer', 'admin')
        )
    );

-- Reviewers can update question status
CREATE POLICY "Reviewers can update question status" ON questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('reviewer', 'admin')
        )
    );

-- Admins can view all questions
CREATE POLICY "Admins can view all questions" ON questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

-- Generation_tasks 表的 RLS 策略
CREATE POLICY "Users can view their own generation tasks" ON generation_tasks
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own generation tasks" ON generation_tasks
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own generation tasks" ON generation_tasks
    FOR UPDATE USING (created_by = auth.uid());

-- Admins can view all generation tasks
CREATE POLICY "Admins can view all generation tasks" ON generation_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

-- 6. 创建辅助函数

-- 获取用户统计信息函数
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS TABLE(
    total_materials BIGINT,
    total_questions BIGINT,
    approved_questions BIGINT,
    pending_questions BIGINT,
    rejected_questions BIGINT,
    total_generation_tasks BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM materials WHERE created_by = user_uuid),
        (SELECT COUNT(*) FROM questions WHERE created_by = user_uuid),
        (SELECT COUNT(*) FROM questions WHERE created_by = user_uuid AND status = 'approved'),
        (SELECT COUNT(*) FROM questions WHERE created_by = user_uuid AND status IN ('pending', 'ai_approved')),
        (SELECT COUNT(*) FROM questions WHERE created_by = user_uuid AND status IN ('rejected', 'ai_rejected')),
        (SELECT COUNT(*) FROM generation_tasks WHERE created_by = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户教材列表函数
CREATE OR REPLACE FUNCTION get_user_materials(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    content TEXT,
    file_type VARCHAR,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        m.content,
        m.file_type,
        m.created_at,
        m.updated_at
    FROM materials m
    WHERE m.created_by = user_uuid
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户试题列表函数
CREATE OR REPLACE FUNCTION get_user_questions(user_uuid UUID, question_status TEXT DEFAULT NULL)
RETURNS TABLE(
    id UUID,
    stem TEXT,
    question_type VARCHAR,
    options JSONB,
    correct_answer VARCHAR,
    analysis JSONB,
    knowledge_level VARCHAR,
    difficulty VARCHAR,
    status VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.stem,
        q.question_type,
        q.options,
        q.correct_answer,
        q.analysis,
        q.knowledge_level,
        q.difficulty,
        q.status,
        q.created_at
    FROM questions q
    WHERE q.created_by = user_uuid
    AND (question_status IS NULL OR q.status = question_status)
    ORDER BY q.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户生成任务列表函数
CREATE OR REPLACE FUNCTION get_user_generation_tasks(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    material_id UUID,
    status VARCHAR,
    parameters JSONB,
    result JSONB,
    ai_model VARCHAR,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gt.id,
        gt.material_id,
        gt.status,
        gt.parameters,
        gt.result,
        gt.ai_model,
        gt.created_at,
        gt.completed_at
    FROM generation_tasks gt
    WHERE gt.created_by = user_uuid
    ORDER BY gt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取待审核试题列表函数（审核员使用）
CREATE OR REPLACE FUNCTION get_pending_review_questions(reviewer_uuid UUID DEFAULT NULL)
RETURNS TABLE(
    id UUID,
    stem TEXT,
    question_type VARCHAR,
    options JSONB,
    correct_answer VARCHAR,
    analysis JSONB,
    knowledge_level VARCHAR,
    difficulty VARCHAR,
    status VARCHAR,
    created_by UUID,
    creator_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.stem,
        q.question_type,
        q.options,
        q.correct_answer,
        q.analysis,
        q.knowledge_level,
        q.difficulty,
        q.status,
        q.created_by,
        u.name as creator_name,
        q.created_at
    FROM questions q
    LEFT JOIN users u ON q.created_by = u.id
    WHERE q.status IN ('pending', 'ai_approved')
    ORDER BY q.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建用户题库视图
CREATE OR REPLACE VIEW user_question_bank AS
SELECT 
    q.id,
    q.stem,
    q.question_type,
    q.options,
    q.correct_answer,
    q.analysis,
    q.difficulty,
    q.knowledge_level,
    q.created_by,
    u.name as creator_name,
    q.created_at
FROM questions q
JOIN users u ON q.created_by = u.id
WHERE q.status = 'approved';

-- 授予权限
GRANT SELECT ON user_question_bank TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_materials(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_questions(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_generation_tasks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_review_questions(UUID) TO authenticated;