-- 更新试题表的状态字段以支持AI审核流程
-- 添加新的状态：ai_reviewing, ai_approved, ai_rejected

ALTER TABLE questions 
DROP CONSTRAINT IF EXISTS questions_status_check;

ALTER TABLE questions 
ADD CONSTRAINT questions_status_check 
CHECK (status IN (
    'pending',      -- 待人工审核
    'approved',     -- 已通过
    'rejected',     -- 已拒绝
    'ai_reviewing', -- AI审核中
    'ai_approved',  -- AI审核通过，待人工审核
    'ai_rejected'   -- AI审核未通过
));

-- 添加metadata字段用于存储审核相关的元数据
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_metadata ON questions USING GIN(metadata);

-- 更新现有数据，将pending状态的试题保持为pending（人工审核）
-- 新的AI生成试题将使用ai_reviewing状态