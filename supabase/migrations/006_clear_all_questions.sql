-- 清除所有试题数据
-- 注意：这将删除questions表和generation_tasks表中的所有数据

-- 首先删除questions表中的所有数据
DELETE FROM questions;

-- 然后删除generation_tasks表中的所有数据
DELETE FROM generation_tasks;

-- 重置序列（如果有的话）
-- 注意：Supabase使用UUID，通常不需要重置序列

-- 输出确认信息
SELECT 'All questions and generation tasks have been cleared' as result;