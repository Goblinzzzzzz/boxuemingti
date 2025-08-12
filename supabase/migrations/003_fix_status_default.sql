-- 修复questions表status字段的默认值
-- 将默认值从'ai_pending'改为'ai_reviewing'

ALTER TABLE questions 
ALTER COLUMN status SET DEFAULT 'ai_reviewing';

-- 更新现有的ai_pending状态记录为ai_reviewing
UPDATE questions 
SET status = 'ai_reviewing' 
WHERE status = 'ai_pending';