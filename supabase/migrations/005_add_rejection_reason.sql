-- 添加rejection_reason列到questions表（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE questions 
        ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;