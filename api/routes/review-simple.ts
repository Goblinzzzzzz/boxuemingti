import { Router, type Request, type Response } from 'express';
import { supabase } from '../services/supabaseClient';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { vercelLogger } from '../vercel-logger';
import { PerformanceMonitor, enhancedErrorHandler, logMemoryUsage } from '../vercel-optimization';
import { optimizeMemoryUsage } from '../vercel-compatibility';
import { questionReviewService } from '../services/questionReviewService';

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pnjibotdkfdvtfgqqakg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM'
);

const router = Router();

/**
 * 获取待审核试题列表
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50; // 增加默认限制
    const offset = (page - 1) * limit;

    console.log('获取待审核试题，页码:', page, '限制:', limit);

    // 获取状态为pending的试题
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('查询试题失败:', error);
      throw error;
    }

    console.log('查询到待审核试题:', questions?.length || 0, '条');

    // 获取总数
    const { count, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (countError) {
      console.error('查询试题总数失败:', countError);
      throw countError;
    }

    console.log('待审核试题总数:', count);

    res.json({
      success: true,
      data: {
        questions: questions || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
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
 * AI审核单个试题
 */
router.post('/ai-review/:questionId', async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;

    // 获取试题信息
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (fetchError || !question) {
      return res.status(404).json({
        success: false,
        error: '试题不存在'
      });
    }

    // 进行AI审核
    const reviewResult = await questionReviewService.reviewQuestion(question);

    res.json({
      success: true,
      data: {
        questionId,
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
router.post('/batch-ai-review', async (req: Request, res: Response) => {
  try {
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的试题ID列表'
      });
    }

    // 获取试题信息
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .in('id', questionIds);

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

    // 格式化结果
    const results = Array.from(reviewResults.entries()).map(([questionId, result]) => ({
      questionId,
      qualityScore: result.score,
      isValid: result.passed,
      issues: result.issues,
      suggestions: result.suggestions
    }));

    res.json({
      success: true,
      data: results
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
 * 通过审核（单个试题）
 */
router.post('/approve/:questionId', async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const { feedback } = req.body;

    console.log('审核通过试题:', questionId, '反馈:', feedback);

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
router.post('/reject/:questionId', async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const { feedback, rejection_reason } = req.body;

    console.log('拒绝审核试题:', questionId, '反馈:', feedback, '拒绝原因:', rejection_reason);

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

/**
 * 批量通过审核
 */
router.post('/batch-approve', async (req: Request, res: Response) => {
  try {
    const { questionIds, feedback } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的试题ID列表'
      });
    }

    console.log('批量通过审核试题:', questionIds, '反馈:', feedback);

    // 批量更新试题状态为已通过
    const { data, error } = await supabase
      .from('questions')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .in('id', questionIds)
      .select();

    if (error) {
      console.error('批量更新试题状态失败:', error);
      throw error;
    }

    console.log('批量审核通过成功:', data?.length, '个试题');

    res.json({
      success: true,
      data: {
        approvedCount: data?.length || 0,
        questionIds,
        message: `已批量通过 ${data?.length || 0} 个试题的审核`
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
 * 批量拒绝审核
 */
router.post('/batch-reject', async (req: Request, res: Response) => {
  try {
    const { questionIds, feedback, rejection_reason } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的试题ID列表'
      });
    }

    console.log('批量拒绝审核试题:', questionIds, '反馈:', feedback, '拒绝原因:', rejection_reason);

    // 批量更新试题状态为已拒绝
    const { data, error } = await supabase
      .from('questions')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .in('id', questionIds)
      .select();

    if (error) {
      console.error('批量更新试题状态失败:', error);
      throw error;
    }

    console.log('批量审核拒绝成功:', data?.length, '个试题');

    res.json({
      success: true,
      data: {
        rejectedCount: data?.length || 0,
        questionIds,
        message: `已批量拒绝 ${data?.length || 0} 个试题的审核`
      }
    });
  } catch (error) {
    console.error('批量审核拒绝失败:', error);
    res.status(500).json({
      success: false,
      error: '批量审核拒绝失败'
    });
  }
});

/**
 * 获取审核统计信息
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    console.log('开始获取审核统计信息...');
    
    // 获取各状态的试题数量
    console.log('正在查询各状态试题数量...');
    const { data: statusCounts, error: statusError } = await supabase
      .from('questions')
      .select('status')
      .not('status', 'is', null);

    console.log('状态统计查询结果:', { statusCounts: statusCounts?.length, statusError });

    if (statusError) {
      console.error('查询状态统计失败:', statusError);
      throw statusError;
    }

    // 统计各状态数量
    const pending = statusCounts?.filter(q => q.status === 'pending').length || 0;
    const approved = statusCounts?.filter(q => q.status === 'approved').length || 0;
    const rejected = statusCounts?.filter(q => q.status === 'rejected').length || 0;
    const total = statusCounts?.length || 0;

    console.log('状态统计:', { pending, approved, rejected, total });

    // 获取平均质量评分
    console.log('正在查询质量评分...');
    const { data: avgScore, error: avgError } = await supabase
      .from('questions')
      .select('quality_score')
      .not('quality_score', 'is', null);

    console.log('质量评分查询结果:', { avgScore: avgScore?.length, avgError });

    if (avgError) {
      console.error('查询质量评分失败:', avgError);
      throw avgError;
    }

    const averageQualityScore = avgScore && avgScore.length > 0
      ? avgScore.reduce((sum, item) => sum + (item.quality_score || 0), 0) / avgScore.length
      : 0;

    const result = {
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total,
        averageQualityScore: Math.round(averageQualityScore * 100) / 100
      }
    };

    console.log('审核统计结果:', result);
    res.json(result);
  } catch (error) {
    console.error('获取审核统计失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      error: '获取审核统计失败',
      details: error.message
    });
  }
});

export default router;