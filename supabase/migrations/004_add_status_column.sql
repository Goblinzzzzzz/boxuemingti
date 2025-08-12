-- 添加status列到questions表（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'status'
    ) THEN
        ALTER TABLE questions 
        ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected'));
        
        CREATE INDEX idx_questions_status ON questions(status);
    END IF;
END $$;

-- 更新现有记录的status（如果为空）
UPDATE questions SET status = 'pending' WHERE status IS NULL;