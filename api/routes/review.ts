import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { questionReviewService } from '../services/questionReviewService';
import { authenticateUser, type AuthenticatedRequest } from '../middleware/auth';
import { aiService } from '../services/aiService';
import { vercelLogger } from '../vercel-logger';
import { PerformanceMonitor, enhancedErrorHandler, logMemoryUsage } from '../vercel-optimization';
import { optimizeMemoryUsage } from '../vercel-compatibility';

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pnjibotdkfdvtfgqqakg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM'
);

const router = Router();

/**
 * 获取待人工审核试题列表（已通过AI审核的试题）
 */
router.get('/pending', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, questionType, difficulty } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('questions')
      .select(`
        *,
        generation_tasks!inner(
          id,
          material_id,
          parameters,
          ai_model,
          created_at,
          created_by
        )
      `)
      .eq('status', 'ai_approved')  // 只显示已通过AI审核的试题
      .eq('generation_tasks.created_by', req.user.id)  // 只显示当前用户的试题
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    // 添加筛选条件
    if (questionType) {
      query = query.eq('question_type', questionType);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: questions, error } = await query;
    console.log('查询结果:', { questions: questions?.length, error });

    if (error) {
      console.error('查询错误:', error);
      throw error;
    }

    // 获取总数
    let countQuery = supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)', { count: 'exact' })
      .eq('status', 'ai_approved')
      .eq('generation_tasks.created_by', req.user.id);

    if (questionType) {
      countQuery = countQuery.eq('question_type', questionType);
    }
    if (difficulty) {
      countQuery = countQuery.eq('difficulty', difficulty);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    res.json({
      success: true,
      data: {
        questions: questions || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取待审核试题失败:', error);
    res.status(500).json({
      success: false,
      error: '获取待审核试题失败'
    });
  }
});

/**
 * 获取AI审核中的试题列表
 */
router.get('/ai-pending', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('获取AI审核中的试题请求');
    const { page = 1, limit = 10, questionType, difficulty } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    console.log('查询参数:', { page, limit, questionType, difficulty, offset });

    console.log('开始构建查询...');
    let query = supabase
      .from('questions')
      .select(`
        *,
        generation_tasks!inner(
          id,
          material_id,
          parameters,
          ai_model,
          created_at,
          created_by
        )
      `)
      .eq('status', 'ai_reviewing')  // AI审核中的试题
      .eq('generation_tasks.created_by', req.user.id)  // 只显示当前用户的试题
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);
    console.log('查询构建完成，开始执行...');

    // 添加筛选条件
    if (questionType) {
      query = query.eq('question_type', questionType);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: questions, error } = await query;
    console.log('查询执行完成，结果:', { questions: questions?.length, error });

    if (error) {
      console.error('查询出错:', error);
      throw error;
    }
    console.log('查询成功，试题数量:', questions?.length);

    // 获取总数
    let countQuery = supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)', { count: 'exact' })
      .eq('status', 'ai_reviewing')
      .eq('generation_tasks.created_by', req.user.id);

    if (questionType) {
      countQuery = countQuery.eq('question_type', questionType);
    }
    if (difficulty) {
      countQuery = countQuery.eq('difficulty', difficulty);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    res.json({
      success: true,
      data: {
        questions: questions || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取AI审核中试题失败:', error);
    res.status(500).json({
      success: false,
      error: '获取AI审核中试题失败'
    });
  }
});

/**
 * 获取AI审核未通过的试题列表
 */
router.get('/ai-rejected', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, questionType, difficulty } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('questions')
      .select(`
        *,
        generation_tasks!inner(
          id,
          material_id,
          parameters,
          ai_model,
          created_at,
          created_by
        )
      `)
      .eq('status', 'ai_rejected')  // AI审核未通过的试题
      .eq('generation_tasks.created_by', req.user.id)  // 只显示当前用户的试题
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    // 添加筛选条件
    if (questionType) {
      query = query.eq('question_type', questionType);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: questions, error } = await query;

    if (error) {
      throw error;
    }

    // 获取总数
    let countQuery = supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)', { count: 'exact' })
      .eq('status', 'ai_rejected')
      .eq('generation_tasks.created_by', req.user.id);

    if (questionType) {
      countQuery = countQuery.eq('question_type', questionType);
    }
    if (difficulty) {
      countQuery = countQuery.eq('difficulty', difficulty);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    res.json({
      success: true,
      data: {
        questions: questions || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取AI审核未通过试题失败:', error);
    res.status(500).json({
      success: false,
      error: '获取AI审核未通过试题失败'
    });
  }
});

/**
 * 对单个试题进行AI自动审核
 */
router.post('/:questionId/auto-review', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionId } = req.params;

    // 获取试题信息（只能审核当前用户的试题）
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select(`
        *,
        generation_tasks!inner(
          id,
          created_by
        )
      `)
      .eq('id', questionId)
      .eq('generation_tasks.created_by', req.user.id)
      .single();

    if (fetchError || !question) {
      return res.status(404).json({
        success: false,
        error: '试题不存在或已审核'
      });
    }

    // 进行AI自动审核
    const reviewResult = await questionReviewService.reviewQuestion(question);

    // 更新试题的审核结果（但不改变状态，仍需人工最终确认）
    const { error: updateError } = await supabase
      .from('questions')
      .update({
        quality_score: reviewResult.score / 100, // 转换为0-1范围
        metadata: {
          auto_review: {
            score: reviewResult.score,
            passed: reviewResult.passed,
            issues: reviewResult.issues,
            suggestions: reviewResult.suggestions,
            reviewed_at: new Date().toISOString()
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      data: {
        questionId,
        reviewResult
      }
    });
  } catch (error) {
    console.error('AI自动审核失败:', error);
    res.status(500).json({
      success: false,
      error: 'AI自动审核失败'
    });
  }
});

/**
 * 批量AI自动审核
 */
router.post('/batch-auto-review', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的试题ID列表'
      });
    }

    // 获取试题信息（只能审核当前用户的试题）
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select(`
        *,
        generation_tasks!inner(
          id,
          created_by
        )
      `)
      .in('id', questionIds)
      .eq('generation_tasks.created_by', req.user.id);

    if (fetchError) {
      throw fetchError;
    }

    if (!questions || questions.length === 0) {
      return res.status(404).json({
        success: false,
        error: '没有找到待审核的试题'
      });
    }

    // 批量进行AI自动审核
    const reviewResults = await questionReviewService.batchReviewQuestions(questions);

    // 批量更新审核结果
    const updatePromises = questions.map(async (question) => {
      const reviewResult = reviewResults.get(question.id);
      if (reviewResult) {
        return supabase
          .from('questions')
          .update({
            quality_score: reviewResult.score / 100,
            metadata: {
              auto_review: {
                score: reviewResult.score,
                passed: reviewResult.passed,
                issues: reviewResult.issues,
                suggestions: reviewResult.suggestions,
                reviewed_at: new Date().toISOString()
              }
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', question.id);
      }
    });

    await Promise.all(updatePromises.filter(Boolean));

    // 统计审核结果
    const results = Array.from(reviewResults.values());
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    res.json({
      success: true,
      data: {
        totalReviewed: totalCount,
        passedCount,
        failedCount: totalCount - passedCount,
        passRate: totalCount > 0 ? (passedCount / totalCount * 100).toFixed(1) : '0',
        results: Object.fromEntries(reviewResults)
      }
    });
  } catch (error) {
    console.error('批量AI自动审核失败:', error);
    res.status(500).json({
      success: false,
      error: '批量AI自动审核失败'
    });
  }
});

/**
 * 人工审核试题（通过/拒绝）
 */
router.post('/:questionId/manual-review', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const { action, reason } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: '无效的审核操作'
      });
    }

    // 获取试题信息（只能审核已通过AI审核且属于当前用户的试题）
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select(`
        *,
        generation_tasks!inner(
          id,
          created_by
        )
      `)
      .eq('id', questionId)
      .eq('status', 'ai_approved')
      .eq('generation_tasks.created_by', req.user.id)
      .single();

    if (fetchError || !question) {
      return res.status(404).json({
        success: false,
        error: '试题不存在或已审核'
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    // 更新试题状态
    const { error: updateError } = await supabase
      .from('questions')
      .update({
        status: newStatus,
        metadata: {
          ...question.metadata,
          manual_review: {
            action,
            reason: reason || '',
            reviewed_at: new Date().toISOString(),
            reviewer: 'system' // 可以后续扩展为实际用户ID
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      data: {
        questionId,
        status: newStatus,
        action,
        reason
      }
    });
  } catch (error) {
    console.error('人工审核失败:', error);
    res.status(500).json({
      success: false,
      error: '人工审核失败'
    });
  }
});

/**
 * 批量人工审核
 */
router.post('/batch-manual-review', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionIds, action, reason } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的试题ID列表'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: '无效的审核操作'
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 首先验证这些试题是否属于当前用户
    const { data: userQuestions, error: verifyError } = await supabase
      .from('questions')
      .select(`
        id,
        generation_tasks!inner(
          created_by
        )
      `)
      .in('id', questionIds)
      .eq('status', 'ai_approved')
      .eq('generation_tasks.created_by', req.user.id);

    if (verifyError) {
      throw verifyError;
    }

    const validQuestionIds = userQuestions?.map(q => q.id) || [];
    
    if (validQuestionIds.length === 0) {
      return res.status(404).json({
        success: false,
        error: '没有找到属于您的待审核试题'
      });
    }

    // 批量更新试题状态
    const { data: updatedQuestions, error: updateError } = await supabase
      .from('questions')
      .update({
        status: newStatus,
        metadata: {
          manual_review: {
            action,
            reason: reason || '',
            reviewed_at: new Date().toISOString(),
            reviewer: 'system'
          }
        },
        updated_at: new Date().toISOString()
      })
      .in('id', validQuestionIds)
      .eq('status', 'ai_approved')  // 只能审核已通过AI审核的试题
      .select('id');

    if (updateError) {
      throw updateError;
    }

    const updatedCount = updatedQuestions?.length || 0;

    res.json({
      success: true,
      data: {
        updatedCount,
        status: newStatus,
        action,
        reason
      }
    });
  } catch (error) {
    console.error('批量人工审核失败:', error);
    res.status(500).json({
      success: false,
      error: '批量人工审核失败'
    });
  }
});

/**
 * AI审核单个试题
 */
router.post('/ai-review/:questionId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionId } = req.params;

    // 获取试题信息（只能审核当前用户的试题）
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select(`
        *,
        generation_tasks!inner(
          id,
          created_by
        )
      `)
      .eq('id', questionId)
      .eq('generation_tasks.created_by', req.user.id)
      .single();

    if (fetchError || !question) {
      return res.status(404).json({
        success: false,
        error: '试题不存在'
      });
    }

    // 进行AI审核
    const reviewResult = await questionReviewService.reviewQuestion(question);

    // 根据审核结果设置试题状态
    const newStatus = reviewResult.passed ? 'ai_approved' : 'ai_rejected';
    
    // 更新试题状态和审核结果
    const { error: updateError } = await supabase
      .from('questions')
      .update({
        status: newStatus,
        quality_score: reviewResult.score / 100, // 转换为0-1范围
        metadata: {
          ...question.metadata,
          ai_review: {
            score: reviewResult.score,
            passed: reviewResult.passed,
            issues: reviewResult.issues,
            suggestions: reviewResult.suggestions,
            reviewed_at: new Date().toISOString()
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      data: {
        questionId,
        status: newStatus,
        qualityScore: reviewResult.score,
        isValid: reviewResult.passed,
        issues: reviewResult.issues,
        suggestions: reviewResult.suggestions
      }
    });
  } catch (error) {
    console.error('AI审核失败:', error);
    res.status(500).json({
      success: false,
      error: 'AI审核失败'
    });
  }
});

/**
 * 批量AI审核
 */
router.post('/batch-ai-review', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的试题ID列表'
      });
    }

    // 获取试题信息（只能审核当前用户的试题）
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select(`
        *,
        generation_tasks!inner(
          id,
          created_by
        )
      `)
      .in('id', questionIds)
      .eq('generation_tasks.created_by', req.user.id);

    if (fetchError) {
      throw fetchError;
    }

    if (!questions || questions.length === 0) {
      return res.status(404).json({
        success: false,
        error: '没有找到试题'
      });
    }

    // 批量进行AI审核
    const reviewResults = await questionReviewService.batchReviewQuestions(questions);

    // 批量更新试题状态和审核结果
    const updatePromises = questions.map(async (question) => {
      const reviewResult = reviewResults.get(question.id);
      if (reviewResult) {
        const newStatus = reviewResult.passed ? 'ai_approved' : 'ai_rejected';
        return supabase
          .from('questions')
          .update({
            status: newStatus,
            quality_score: reviewResult.score / 100,
            metadata: {
              ...question.metadata,
              ai_review: {
                score: reviewResult.score,
                passed: reviewResult.passed,
                issues: reviewResult.issues,
                suggestions: reviewResult.suggestions,
                reviewed_at: new Date().toISOString()
              }
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', question.id);
      }
    });

    await Promise.all(updatePromises.filter(Boolean));

    // 转换结果格式
    const results = Array.from(reviewResults.entries()).map(([questionId, result]) => ({
      questionId,
      status: result.passed ? 'ai_approved' : 'ai_rejected',
      qualityScore: result.score,
      isValid: result.passed,
      issues: result.issues,
      suggestions: result.suggestions
    }));

    // 统计审核结果
    const passedCount = results.filter(r => r.isValid).length;
    const rejectedCount = results.length - passedCount;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          approved: passedCount,
          rejected: rejectedCount
        }
      }
    });
  } catch (error) {
    console.error('批量AI审核失败:', error);
    res.status(500).json({
      success: false,
      error: '批量AI审核失败'
    });
  }
});

/**
 * 提交试题到审核流程
 */
router.post('/submit', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questions, generationTaskId } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的试题列表'
      });
    }

    // 验证生成任务是否属于当前用户
    if (generationTaskId) {
      const { data: task, error: taskError } = await supabase
        .from('generation_tasks')
        .select('id, created_by')
        .eq('id', generationTaskId)
        .eq('created_by', req.user.id)
        .single();

      if (taskError || !task) {
        return res.status(403).json({
          success: false,
          error: '无权访问该生成任务'
        });
      }
    }

    // 准备插入数据
    const questionsToInsert = questions.map(question => ({
      ...question,
      status: 'ai_reviewing',
      task_id: generationTaskId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // 批量插入试题到数据库
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select('id');

    if (insertError) {
      throw insertError;
    }

    const insertedCount = insertedQuestions?.length || 0;

    res.json({
      success: true,
      data: {
        insertedCount,
        message: `成功提交 ${insertedCount} 道试题到审核流程`
      }
    });
  } catch (error) {
    console.error('提交审核失败:', error);
    res.status(500).json({
      success: false,
      error: '提交审核失败'
    });
  }
});

/**
 * 批量审核通过并保存到题库
 */
router.post('/batch-approve', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的试题ID列表'
      });
    }

    // 获取待审核的试题（只能操作当前用户的试题）
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select(`
        *,
        generation_tasks!inner(
          id,
          created_by
        )
      `)
      .in('id', questionIds)
      .eq('status', 'pending')
      .eq('generation_tasks.created_by', req.user.id);

    if (fetchError) {
      throw fetchError;
    }

    if (!questions || questions.length === 0) {
      return res.status(404).json({
        success: false,
        error: '没有找到待审核的试题'
      });
    }

    // 批量更新试题状态为已通过
    const { data: updatedQuestions, error: updateError } = await supabase
      .from('questions')
      .update({
        status: 'approved',
        metadata: {
          manual_review: {
            action: 'approve',
            reason: '批量审核通过',
            reviewed_at: new Date().toISOString(),
            reviewer: 'system'
          }
        },
        updated_at: new Date().toISOString()
      })
      .in('id', questionIds)
      .eq('status', 'pending')
      .select('*');

    if (updateError) {
      throw updateError;
    }

    const approvedCount = updatedQuestions?.length || 0;

    res.json({
      success: true,
      data: {
        approvedCount,
        message: `成功审核通过 ${approvedCount} 道试题并保存到题库`
      }
    });
  } catch (error) {
    console.error('批量审核通过失败:', error);
    res.status(500).json({
      success: false,
      error: '批量审核通过失败'
    });
  }
});

/**
 * 获取审核统计信息
 */
router.get('/stats', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 获取待审核试题数量（当前用户）
    const { count: pendingCount } = await supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('generation_tasks.created_by', req.user.id);

    // 获取已通过试题数量（当前用户）
    const { count: approvedCount } = await supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('generation_tasks.created_by', req.user.id);

    // 获取已拒绝试题数量（当前用户）
    const { count: rejectedCount } = await supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .eq('generation_tasks.created_by', req.user.id);

    // 获取总试题数量（当前用户）
    const { count: totalCount } = await supabase
      .from('questions')
      .select('id, generation_tasks!inner(created_by)', { count: 'exact', head: true })
      .eq('generation_tasks.created_by', req.user.id);

    res.json({
      success: true,
      data: {
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
        total: totalCount || 0
      }
    });
  } catch (error) {
    console.error('获取审核统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取审核统计失败'
    });
  }
});

/**
 * 通过审核（单个试题）
 */
router.post('/approve/:questionId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const { feedback } = req.body;

    console.log('审核通过试题:', questionId, '反馈:', feedback);

    // 首先验证试题是否属于当前用户
    const { data: question, error: verifyError } = await supabase
      .from('questions')
      .select(`
        id,
        generation_tasks!inner(
          created_by
        )
      `)
      .eq('id', questionId)
      .eq('generation_tasks.created_by', req.user.id)
      .single();

    if (verifyError || !question) {
      return res.status(404).json({
        success: false,
        error: '试题不存在或无权访问'
      });
    }

    // 更新试题状态为已通过
    const { data, error } = await supabase
      .from('questions')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error) {
      console.error('更新试题状态失败:', error);
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: '试题不存在'
      });
    }

    console.log('试题审核通过成功:', data);

    res.json({
      success: true,
      data: {
        questionId,
        status: 'approved',
        message: '试题已通过审核'
      }
    });
  } catch (error) {
    console.error('审核通过失败:', error);
    res.status(500).json({
      success: false,
      error: '审核通过失败'
    });
  }
});

/**
 * 拒绝审核（单个试题）
 */
router.post('/reject/:questionId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const { feedback, rejection_reason } = req.body;

    console.log('拒绝审核试题:', questionId, '反馈:', feedback, '拒绝原因:', rejection_reason);

    // 首先验证试题是否属于当前用户
    const { data: question, error: verifyError } = await supabase
      .from('questions')
      .select(`
        id,
        generation_tasks!inner(
          created_by
        )
      `)
      .eq('id', questionId)
      .eq('generation_tasks.created_by', req.user.id)
      .single();

    if (verifyError || !question) {
      return res.status(404).json({
        success: false,
        error: '试题不存在或无权访问'
      });
    }

    // 更新试题状态为已拒绝
    const { data, error } = await supabase
      .from('questions')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error) {
      console.error('更新试题状态失败:', error);
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: '试题不存在'
      });
    }

    console.log('试题审核拒绝成功:', data);

    res.json({
      success: true,
      data: {
        questionId,
        status: 'rejected',
        message: '试题已被拒绝'
      }
    });
  } catch (error) {
    console.error('审核拒绝失败:', error);
    res.status(500).json({
      success: false,
      error: '审核拒绝失败'
    });
  }
});

export default router;