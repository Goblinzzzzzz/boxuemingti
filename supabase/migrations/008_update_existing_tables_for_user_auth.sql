-- 更新现有表结构以支持用户权限管理
-- 为现有表添加用户关联字段和行级安全策略

-- 为现有表添加用户关联字段
ALTER TABLE materials ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_created_by ON generation_tasks(created_by);

-- 为现有表启用行级安全策略
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_tasks ENABLE ROW LEVEL SECURITY;

-- 创建教材表的数据访问策略
-- 用户只能查看自己创建的教材
CREATE POLICY "Users can only see own materials" ON materials
    FOR ALL USING (created_by = auth.uid());

-- 管理员可以查看所有教材
CREATE POLICY "Admins can see all materials" ON materials
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    ));

-- 审核员可以查看所有教材（用于审核试题时查看教材内容）
CREATE POLICY "Reviewers can see all materials" ON materials
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name = 'reviewer'
    ));

-- 创建试题表的数据访问策略
-- 用户只能查看自己创建的试题
CREATE POLICY "Users can only see own questions" ON questions
    FOR ALL USING (created_by = auth.uid());

-- 管理员可以查看所有试题
CREATE POLICY "Admins can see all questions" ON questions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    ));

-- 审核员可以查看和更新所有试题（用于审核）
CREATE POLICY "Reviewers can see all questions" ON questions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name = 'reviewer'
    ));

CREATE POLICY "Reviewers can update questions for review" ON questions
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name = 'reviewer'
    ));

-- 创建生成任务表的数据访问策略
-- 用户只能查看自己创建的生成任务
CREATE POLICY "Users can only see own tasks" ON generation_tasks
    FOR ALL USING (created_by = auth.uid());

-- 管理员可以查看所有生成任务
CREATE POLICY "Admins can see all tasks" ON generation_tasks
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    ));

-- 审核员可以查看所有生成任务（用于了解试题来源）
CREATE POLICY "Reviewers can see all tasks" ON generation_tasks
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name = 'reviewer'
    ));

-- 创建函数：获取用户的教材列表
CREATE OR REPLACE FUNCTION get_user_materials(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    file_type VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT m.id, m.title, m.content, m.file_type, m.created_at, m.updated_at
    FROM materials m
    WHERE m.created_by = user_uuid
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：获取用户的试题列表
CREATE OR REPLACE FUNCTION get_user_questions(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    stem TEXT,
    question_type VARCHAR,
    options JSONB,
    correct_answer TEXT,
    analysis JSONB,
    status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT q.id, q.stem, q.question_type, q.options, q.correct_answer, q.analysis, q.status, q.created_at
    FROM questions q
    WHERE q.created_by = user_uuid
    ORDER BY q.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：获取用户的生成任务列表
CREATE OR REPLACE FUNCTION get_user_generation_tasks(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    material_id UUID,
    status VARCHAR,
    question_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT gt.id, gt.material_id, gt.status, gt.question_count, gt.created_at, gt.completed_at
    FROM generation_tasks gt
    WHERE gt.created_by = user_uuid
    ORDER BY gt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：获取待审核的试题列表（审核员使用）
CREATE OR REPLACE FUNCTION get_pending_review_questions(reviewer_uuid UUID)
RETURNS TABLE(
    id UUID,
    stem TEXT,
    question_type VARCHAR,
    options JSONB,
    correct_answer TEXT,
    analysis JSONB,
    created_by UUID,
    creator_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- 检查用户是否有审核权限
    IF NOT check_user_permission(reviewer_uuid, 'questions.review') THEN
        RAISE EXCEPTION 'Access denied: User does not have review permission';
    END IF;
    
    RETURN QUERY
    SELECT q.id, q.stem, q.question_type, q.options, q.correct_answer, q.analysis, 
           q.created_by, u.name as creator_name, q.created_at
    FROM questions q
    JOIN users u ON q.created_by = u.id
    WHERE q.status = 'ai_reviewing'
    ORDER BY q.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：获取用户统计信息
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS TABLE(
    total_materials INTEGER,
    total_questions INTEGER,
    approved_questions INTEGER,
    pending_questions INTEGER,
    rejected_questions INTEGER,
    total_generation_tasks INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM materials WHERE created_by = user_uuid) as total_materials,
        (SELECT COUNT(*)::INTEGER FROM questions WHERE created_by = user_uuid) as total_questions,
        (SELECT COUNT(*)::INTEGER FROM questions WHERE created_by = user_uuid AND status = 'approved') as approved_questions,
        (SELECT COUNT(*)::INTEGER FROM questions WHERE created_by = user_uuid AND status IN ('pending', 'ai_reviewing')) as pending_questions,
        (SELECT COUNT(*)::INTEGER FROM questions WHERE created_by = user_uuid AND status = 'rejected') as rejected_questions,
        (SELECT COUNT(*)::INTEGER FROM generation_tasks WHERE created_by = user_uuid) as total_generation_tasks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建视图：用户的题库（已通过审核的试题）
CREATE OR REPLACE VIEW user_question_bank AS
SELECT 
    q.id,
    q.stem,
    q.question_type,
    q.options,
    q.correct_answer,
    q.analysis,
    q.knowledge_level,
    q.difficulty,
    q.created_by,
    u.name as creator_name,
    q.created_at,
    q.updated_at
FROM questions q
JOIN users u ON q.created_by = u.id
WHERE q.status = 'approved';

-- 为视图启用RLS
ALTER VIEW user_question_bank SET (security_barrier = true);

-- 创建视图的访问策略
CREATE POLICY "Users can see own approved questions" ON questions
    FOR SELECT USING (created_by = auth.uid() AND status = 'approved');

-- 管理员和审核员可以查看所有已批准的试题
CREATE POLICY "Admins and reviewers can see all approved questions" ON questions
    FOR SELECT USING (
        status = 'approved' AND EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'reviewer')
        )
    );