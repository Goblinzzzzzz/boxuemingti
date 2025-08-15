import express, { type Request, type Response } from 'express';
import { supabase } from '../services/supabaseClient';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { supabaseServer, successResponse, errorResponse, ApiResponse } from '../utils/supabase-server';
import { questionReviewService } from '../services/questionReviewService';
import { PerformanceMonitor, enhancedErrorHandler, logMemoryUsage } from '../vercel-optimization';
import { optimizeMemoryUsage } from '../vercel-compatibility';

const router = express.Router();

// Vercel 环境检测和优化
if (process.env.VERCEL) {
  console.log('🔍 试题路由 - Vercel 环境检测');
  logMemoryUsage('试题路由初始化');
}

// 获取当前用户的试题列表（支持筛选和分页）
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const queryId = Date.now().toString(36);
  const monitor = new PerformanceMonitor(`试题列表查询-${queryId}`);
  
  try {
    console.log(`[QUESTIONS-${queryId}] 开始获取试题列表...`);
    monitor.checkpoint('请求开始');
    
    // Vercel 环境内存优化
    if (process.env.VERCEL) {
      optimizeMemoryUsage();
    }
    const {
      page = 1,
      limit = 20,
      questionType,
      difficulty,
      knowledgeLevel,
      knowledgePointId,
      search
    } = req.query;

    let query = supabase
      .from('questions')
      .select(`
        *,
        knowledge_points(id, title, level),
        generation_tasks!inner(created_by)
      `)
      // 只返回当前用户审核通过的试题
      .eq('status', 'approved')
      .eq('generation_tasks.created_by', req.user.id);

    // 应用筛选条件
    if (questionType) {
      query = query.eq('question_type', questionType);
    }
    
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    
    if (knowledgeLevel) {
      query = query.eq('knowledge_level', knowledgeLevel);
    }
    
    if (knowledgePointId) {
      query = query.eq('knowledge_point_id', knowledgePointId);
    }
    
    if (search) {
      query = query.ilike('stem', `%${search}%`);
    }

    // 分页
    const offset = (Number(page) - 1) * Number(limit);
    query = query
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    const { data: questions, error, count } = await query;

    if (error) {
      throw error;
    }

    // 获取总数（只统计当前用户已通过审核的试题）
    const { count: totalCount } = await supabase
      .from('questions')
      .select('*, generation_tasks!inner(created_by)', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('generation_tasks.created_by', req.user.id);

    res.json({
      success: true,
      data: questions || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error(`[QUESTIONS-${queryId}] 获取试题列表失败:`, error);
    enhancedErrorHandler(error, `试题列表查询-${queryId}`);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: '获取试题列表失败',
        queryId,
        timestamp: new Date().toISOString()
      });
    }
  } finally {
    // 内存清理
    if (process.env.VERCEL) {
      optimizeMemoryUsage();
    }
  }
});

// 获取当前用户的试题统计信息
router.get('/stats', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const statsId = Date.now().toString(36);
  const monitor = new PerformanceMonitor(`试题统计-${statsId}`);
  
  try {
    console.log(`[STATS-${statsId}] 开始获取试题统计信息...`);
    monitor.checkpoint('请求开始');
    
    // Vercel 环境内存优化
    if (process.env.VERCEL) {
      optimizeMemoryUsage();
    }
    // 总试题数（只统计当前用户已通过审核的试题）
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*, generation_tasks!inner(created_by)', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('generation_tasks.created_by', req.user.id);

    // 按题型统计（只统计当前用户已通过审核的试题）
    const { data: typeStats } = await supabase
      .from('questions')
      .select('question_type, generation_tasks!inner(created_by)')
      .eq('status', 'approved')
      .eq('generation_tasks.created_by', req.user.id)
      .then(result => {
        const stats = {};
        result.data?.forEach(item => {
          stats[item.question_type] = (stats[item.question_type] || 0) + 1;
        });
        return { data: stats };
      });

    // 按难度统计（只统计当前用户已通过审核的试题）
    const { data: difficultyStats } = await supabase
      .from('questions')
      .select('difficulty, generation_tasks!inner(created_by)')
      .eq('status', 'approved')
      .eq('generation_tasks.created_by', req.user.id)
      .then(result => {
        const stats = {};
        result.data?.forEach(item => {
          stats[item.difficulty] = (stats[item.difficulty] || 0) + 1;
        });
        return { data: stats };
      });

    // 按知识点分级统计（只统计当前用户已通过审核的试题）
    const { data: levelStats } = await supabase
      .from('questions')
      .select('knowledge_level, generation_tasks!inner(created_by)')
      .eq('status', 'approved')
      .eq('generation_tasks.created_by', req.user.id)
      .then(result => {
        const stats = {};
        result.data?.forEach(item => {
          stats[item.knowledge_level] = (stats[item.knowledge_level] || 0) + 1;
        });
        return { data: stats };
      });

    res.json({
      success: true,
      data: {
        total: totalQuestions || 0,
        byType: typeStats || {},
        byDifficulty: difficultyStats || {},
        byLevel: levelStats || {}
      }
    });
  } catch (error) {
    console.error(`[STATS-${statsId}] 获取统计信息失败:`, error);
    enhancedErrorHandler(error, `试题统计-${statsId}`);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: '获取统计信息失败',
        statsId,
        timestamp: new Date().toISOString()
      });
    }
  } finally {
    // 内存清理
    if (process.env.VERCEL) {
      optimizeMemoryUsage();
    }
  }
});

// 获取单个试题详情
router.get('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: question, error } = await supabase
      .from('questions')
      .select(`
        *,
        knowledge_points(id, title, level),
        generation_tasks!inner(id, material_id, created_by, materials(title))
      `)
      .eq('id', id)
      .eq('generation_tasks.created_by', req.user.id)
      .single();

    if (error || !question) {
      return res.status(404).json({
        success: false,
        error: '试题不存在'
      });
    }

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('获取试题详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取试题详情失败'
    });
  }
});

// 更新试题
router.put('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      questionText,
      options,
      correctAnswer,
      explanation,
      difficulty,
      knowledgeLevel,
      knowledgePointId
    } = req.body;

    const updateData: any = {};
    
    if (questionText !== undefined) updateData.stem = questionText;
    if (options !== undefined) updateData.options = options;
    if (correctAnswer !== undefined) updateData.correct_answer = correctAnswer;
    if (explanation !== undefined) updateData.explanation = explanation;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (knowledgeLevel !== undefined) updateData.knowledge_level = knowledgeLevel;
    if (knowledgePointId !== undefined) updateData.knowledge_point_id = knowledgePointId;
    
    updateData.updated_at = new Date().toISOString();

    // 首先检查试题是否属于当前用户
    const { data: existingQuestion } = await supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)')
      .eq('id', id)
      .eq('generation_tasks.created_by', req.user.id)
      .single();

    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        error: '试题不存在或无权限访问'
      });
    }

    const { data: question, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('更新试题失败:', error);
    res.status(500).json({
      success: false,
      error: '更新试题失败'
    });
  }
});

// 删除试题
router.delete('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 首先检查试题是否属于当前用户
    const { data: existingQuestion } = await supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)')
      .eq('id', id)
      .eq('generation_tasks.created_by', req.user.id)
      .single();

    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        error: '试题不存在或无权限删除'
      });
    }

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: '试题删除成功'
    });
  } catch (error) {
    console.error('删除试题失败:', error);
    res.status(500).json({
      success: false,
      error: '删除试题失败'
    });
  }
});

// 批量删除试题
router.delete('/batch', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的试题ID列表'
      });
    }

    // 首先检查所有试题是否属于当前用户
    const { data: userQuestions } = await supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)')
      .in('id', ids)
      .eq('generation_tasks.created_by', req.user.id);

    const userQuestionIds = userQuestions?.map(q => q.id) || [];
    
    if (userQuestionIds.length !== ids.length) {
      return res.status(403).json({
        success: false,
        error: '部分试题不存在或无权限删除'
      });
    }

    const { error } = await supabase
      .from('questions')
      .delete()
      .in('id', userQuestionIds);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 道试题`
    });
  } catch (error) {
    console.error('批量删除试题失败:', error);
    res.status(500).json({
      success: false,
      error: '批量删除试题失败'
    });
  }
});

// 导出试题
router.get('/export', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids, format = 'json' } = req.query;
    const questionIds = ids ? (Array.isArray(ids) ? ids : String(ids).split(',')) : null;

    let query = supabase
      .from('questions')
      .select(`
        *,
        knowledge_points(title, level),
        generation_tasks!inner(created_by)
      `)
      .eq('generation_tasks.created_by', req.user.id);

    if (questionIds && questionIds.length > 0) {
      query = query.in('id', questionIds);
    }

    const { data: questions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (format === 'json') {
      res.json({
        success: true,
        data: questions || []
      });
    } else if (format === 'csv') {
      // 生成CSV格式
      const csvData = generateCSV(questions || []);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=questions.csv');
      res.send(csvData);
    } else {
      res.status(400).json({
        success: false,
        error: '不支持的导出格式'
      });
    }
  } catch (error) {
    console.error('导出试题失败:', error);
    res.status(500).json({
      success: false,
      error: '导出试题失败'
    });
  }
});

// 获取知识点列表
router.get('/knowledge-points/list', async (req: Request, res: Response) => {
  try {
    const { data: knowledgePoints, error } = await supabase
      .from('knowledge_points')
      .select('*')
      .order('title');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: knowledgePoints || []
    });
  } catch (error) {
    console.error('获取知识点列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取知识点列表失败'
    });
  }
});

// 质量评分
router.post('/:id/score', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;

    if (score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        error: '评分必须在0-100之间'
      });
    }

    // 首先检查试题是否属于当前用户
    const { data: existingQuestion } = await supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)')
      .eq('id', id)
      .eq('generation_tasks.created_by', req.user.id)
      .single();

    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        error: '试题不存在或无权限评分'
      });
    }

    const { data: question, error } = await supabase
      .from('questions')
      .update({
        quality_score: score,
        feedback: feedback || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('评分失败:', error);
    res.status(500).json({
      success: false,
      error: '评分失败'
    });
  }
});

// 创建单个试题
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      questionType,
      questionText,
      options,
      correctAnswer,
      explanation,
      difficulty,
      knowledgeLevel,
      knowledgePointId,
      qualityScore,

    } = req.body;

    // 验证必填字段
    if (!questionType || !questionText || !correctAnswer) {
      return res.status(400).json({
        success: false,
        error: '题型、题干和正确答案为必填字段'
      });
    }

    // 获取当前用户的task_id（如果没有提供的话）
    let taskId = req.body.taskId;
    if (!taskId) {
      const { data: tasks } = await supabase
        .from('generation_tasks')
        .select('id')
        .eq('created_by', req.user.id)
        .limit(1);
      taskId = tasks?.[0]?.id;
    }

    const insertData = {
      task_id: taskId,
      question_type: questionType,
      stem: questionText,  // 使用正确的字段名
      options: options || [],
      correct_answer: correctAnswer,
      analysis: typeof explanation === 'string' ? JSON.parse(explanation) : explanation || {},  // 使用正确的字段名
      difficulty: difficulty || '中',
      knowledge_level: knowledgeLevel || 'HR掌握',
      quality_score: qualityScore || 0
    };

    const { data: question, error } = await supabase
      .from('questions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: question,
      message: '试题创建成功'
    });
  } catch (error) {
    console.error('创建试题失败:', error);
    res.status(500).json({
      success: false,
      error: '创建试题失败'
    });
  }
});

// 批量保存试题
router.post('/batch', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('=== 批量保存试题接口调用 ===');
    console.log('请求体:', JSON.stringify(req.body, null, 2));
    
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.error('无效的试题数据:', { questions, type: typeof questions, isArray: Array.isArray(questions) });
      return res.status(400).json({
        success: false,
        error: '请提供要保存的试题列表'
      });
    }
    
    console.log(`接收到 ${questions.length} 道试题待保存`);

    // 准备批量插入的数据
    const insertData = questions.map((q, index) => {
      console.log(`处理第${index + 1}道试题数据:`, JSON.stringify(q, null, 2));
      
      // 验证必填字段
      if (!q.question_type) {
        console.error(`第${index + 1}道试题缺少question_type字段:`, q);
        throw new Error(`第${index + 1}道试题缺少题型信息`);
      }
      
      if (!q.stem && !q.question_text) {
        console.error(`第${index + 1}道试题缺少题干:`, q);
        throw new Error(`第${index + 1}道试题缺少题干信息`);
      }
      
      if (!q.correct_answer) {
        console.error(`第${index + 1}道试题缺少正确答案:`, q);
        throw new Error(`第${index + 1}道试题缺少正确答案`);
      }
      
      // 处理options格式，确保它是数组格式
      let options = q.options;
      if (typeof options === 'object' && !Array.isArray(options)) {
        // 如果是对象格式（如{A: '选项A', B: '选项B'}），转换为数组
        options = Object.values(options);
        console.log(`第${index + 1}道试题options从对象转换为数组:`, options);
      }

      // 获取当前用户的task_id
      let taskId = q.task_id || q.generation_task_id;
      if (!taskId) {
        // 如果没有task_id，需要创建一个默认的生成任务
        console.log(`第${index + 1}道试题没有task_id，需要创建默认任务`);
        // 这里可以创建一个默认的生成任务或使用现有的
        taskId = null; // 暂时设为null，实际应用中可能需要创建默认任务
      }

      const insertItem = {
        task_id: taskId,
        question_type: q.question_type,
        stem: q.stem || q.question_text,  // 支持两种字段名
        options: options,
        correct_answer: q.correct_answer,
        analysis: q.analysis || (typeof q.explanation === 'string' ? JSON.parse(q.explanation) : q.explanation) || {},
        difficulty: q.difficulty || '中',
        knowledge_level: q.knowledge_level || 'HR掌握',
        quality_score: q.quality_score || 0.8,
        status: 'ai_reviewing',  // 设置初始状态为AI审核中
        metadata: {
          workflow: {
            created_at: new Date().toISOString(),
            stage: 'ai_review',
            auto_submitted: true
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log(`第${index + 1}道试题转换后的数据:`, JSON.stringify(insertItem, null, 2));
      return insertItem;
    });

    // 批量插入数据
    console.log('准备插入的数据条数:', insertData.length);
    console.log('准备插入的数据:', JSON.stringify(insertData, null, 2));
    
    const { data, error } = await supabase
      .from('questions')
      .insert(insertData)
      .select();

    console.log('Supabase插入结果:', { 
      success: !error, 
      dataCount: data?.length, 
      error: error 
    });

    if (error) {
      console.error('插入数据库失败:', error);
      return res.status(500).json({
        success: false,
        error: `数据库插入失败: ${error.message}`,
        details: error
      });
    }

    if (!data || data.length === 0) {
      console.error('插入成功但没有返回数据');
      return res.status(500).json({
        success: false,
        error: '插入成功但没有返回数据'
      });
    }

    // 试题保存成功，返回结果
    console.log(`成功保存 ${data.length} 道试题到数据库`);
    
    const result = {
      success: true,
      data: data,
      message: `成功保存 ${data.length} 道试题，等待提交审核`,
      count: data.length
    };

    console.log('最终返回结果:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('批量保存试题失败详情:', {
      error: error,
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    res.status(500).json({
      success: false,
      error: '批量保存试题失败',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 生成CSV格式数据
function generateCSV(questions: any[]): string {
  const headers = [
    'ID', '题型', '难度', '知识点分级', '题干', '选项', '正确答案', '解析', '质量评分', '创建时间'
  ];
  
  const rows = questions.map(q => [
    q.id,
    q.question_type,
    q.difficulty,
    q.knowledge_level,
    `"${q.question_text.replace(/"/g, '""')}"`,
    `"${JSON.stringify(q.options).replace(/"/g, '""')}"`,
    q.correct_answer,
    `"${q.explanation?.replace(/"/g, '""') || ''}"`,
    q.quality_score || '',
    q.created_at
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

export default router;