-- 创建教材表
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    file_type VARCHAR(20),
    file_path VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_materials_title ON materials(title);
CREATE INDEX idx_materials_created_at ON materials(created_at DESC);

-- 创建生成任务表
CREATE TABLE generation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materials(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    parameters JSONB NOT NULL,
    result JSONB DEFAULT '{}',
    ai_model VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX idx_generation_tasks_status ON generation_tasks(status);
CREATE INDEX idx_generation_tasks_material ON generation_tasks(material_id);

-- 创建试题表
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES generation_tasks(id),
    stem TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer VARCHAR(10) NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('判断题', '单选题', '多选题')),
    knowledge_level VARCHAR(20) NOT NULL CHECK (knowledge_level IN ('HR掌握', '全员掌握', '全员熟悉', '全员了解')),
    difficulty VARCHAR(10) DEFAULT '中' CHECK (difficulty IN ('易', '中', '难')),
    analysis JSONB NOT NULL,
    quality_score FLOAT DEFAULT 0.0 CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_knowledge_level ON questions(knowledge_level);
CREATE INDEX idx_questions_task ON questions(task_id);
CREATE INDEX idx_questions_quality_score ON questions(quality_score DESC);

-- 为匿名用户授予权限
GRANT ALL PRIVILEGES ON materials TO anon;
GRANT ALL PRIVILEGES ON generation_tasks TO anon;
GRANT ALL PRIVILEGES ON questions TO anon;

-- 为认证用户授予权限
GRANT ALL PRIVILEGES ON materials TO authenticated;
GRANT ALL PRIVILEGES ON generation_tasks TO authenticated;
GRANT ALL PRIVILEGES ON questions TO authenticated;

-- 插入示例教材
INSERT INTO materials (title, content, file_type, metadata) VALUES 
('人力资源管理基础', '人力资源管理是指企业运用现代管理方法，对人力资源的获取、开发、保持和利用等方面所进行的计划、组织、指挥、控制和协调等一系列活动，最终目标是实现企业目标和员工价值的最大化。\n\n岗位价值评估是人力资源管理的重要环节，主要目的是确定不同岗位对组织目标实现的贡献程度。岗位价值评估应当以对组织目标的贡献为基础，综合考虑岗位的责任、技能要求、工作复杂性等因素。', 'text', '{"chapter": "第一章", "pages": "1-20"}'),
('绩效管理制度', '绩效管理是一个持续的过程，包括绩效计划、绩效实施、绩效考核和绩效反馈四个环节。有效的绩效管理能够提升员工工作积极性，促进组织目标的实现。\n\n组织设计是企业管理的基础工作，需要根据企业战略、规模、环境等因素进行科学设计。组织设计的基本方法包括职能制、事业部制、矩阵制等多种形式。', 'pdf', '{"source": "内部培训材料", "version": "2024"}');

-- 插入示例生成任务
INSERT INTO generation_tasks (material_id, status, parameters, ai_model, completed_at) VALUES 
((SELECT id FROM materials WHERE title = '人力资源管理基础'), 'completed', '{"questionCount": 10, "questionTypes": ["单选题", "判断题"], "difficulty": "中"}', 'gpt-4', NOW());

-- 插入示例试题
INSERT INTO questions (task_id, stem, options, correct_answer, question_type, knowledge_level, difficulty, analysis, quality_score, status) VALUES 
((SELECT id FROM generation_tasks LIMIT 1), '人力资源管理的核心目标是什么？', '{"A": "降低成本", "B": "提高效率", "C": "实现人与组织的共同发展", "D": "增加利润"}', 'C', '单选题', 'HR掌握', '中', '{"textbook": "根据《第5届HR搏学考试辅导教材》第15页，人力资源管理的最终目标是实现企业目标和员工价值的最大化。", "explanation": "人力资源管理的核心目标是实现人与组织的共同发展，通过有效的人力资源配置和开发来提升组织绩效，同时促进员工个人价值的实现。", "conclusion": "本题答案为C，人力资源管理强调人与组织的协调发展。"}', 0.95, 'approved'),
((SELECT id FROM generation_tasks LIMIT 1), '以下关于岗位价值评估的说法，哪项是正确的？', '{"A": "主要考虑岗位稀缺性", "B": "以对组织目标的贡献为基础", "C": "重点关注员工满意度", "D": "依据薪资高低判断"}', 'B', '单选题', 'HR掌握', '中', '{"textbook": "根据《第5届HR搏学考试辅导教材》第82页，岗位价值评估应当以对组织目标的贡献为基础。", "explanation": "岗位价值评估的核心在于评估不同岗位对组织目标实现的贡献程度，需要综合考虑岗位的责任、技能要求、工作复杂性等因素。", "conclusion": "本题答案为B，岗位价值评估以对组织目标的贡献为基础。"}', 0.92, 'pending'),
((SELECT id FROM generation_tasks LIMIT 1), '绩效管理包括绩效计划、绩效实施、绩效考核和绩效反馈四个环节。', '{"A": "正确", "B": "错误"}', 'A', '判断题', '全员掌握', '易', '{"textbook": "根据《第5届HR搏学考试辅导教材》第95页，绩效管理是一个持续的过程，包括绩效计划、绩效实施、绩效考核和绩效反馈四个环节。", "explanation": "绩效管理确实是一个完整的循环过程，包含四个关键环节，每个环节都有其特定的作用和要求。", "conclusion": "本题答案为A，绩效管理包括四个环节的说法是正确的。"}', 0.88, 'approved');