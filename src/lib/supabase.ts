import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnjibotdkfdvtfgqqakg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjM4MjYsImV4cCI6MjA2OTkzOTgyNn0.VUI71aiugdczqFfg8V5wSFzxYstwXLF6Lagz0D5WQ6w'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 数据库类型定义
export interface KnowledgePoint {
  id: string
  title: string
  description?: string
  level: 'HR掌握' | '全员掌握' | '全员熟悉' | '全员了解'
  textbook_page?: string
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  stem: string
  options: string[]
  correct_answer: string
  question_type: '判断题' | '单选题' | '多选题'
  difficulty: '易' | '中' | '难'
  analysis: {
    textbook: string
    explanation: string
    conclusion: string
  }
  knowledge_point_id: string
  status: 'pending' | 'approved' | 'rejected' | 'ai_reviewing' | 'ai_approved' | 'ai_rejected'
  task_id?: string
  knowledge_level?: 'HR掌握' | '全员掌握' | '全员熟悉' | '全员了解'
  quality_score?: number
  metadata?: any
  feedback?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// 规范检查结果类型
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  suggestions: string[]
}