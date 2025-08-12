-- 增加materials表中file_type字段的长度
ALTER TABLE materials ALTER COLUMN file_type TYPE VARCHAR(100);