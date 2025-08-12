import express, { type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import aiService from '../services/aiService.ts';

const router = express.Router();

// 初始化Supabase客户端
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pnjibotdkfdvtfgqqakg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM'
);

// 创建生成任务
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const {
      materialId,
      questionCount,
      questionTypes,
      difficulty,
      knowledgePoints
    } = req.body;

    // 验证必需参数
    if (!materialId || !questionCount || !questionTypes || !difficulty) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数'
      });
    }

    // 获取教材信息
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return res.status(404).json({
        success: false,
        error: '教材不存在'
      });
    }

    // 创建生成任务
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .insert({
        material_id: materialId,
        status: 'pending',
        parameters: {
          questionCount,
          questionTypes,
          difficulty,
          knowledgePoints: knowledgePoints || [],
          progress: 0,
          settings: {
            aiModel: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 2000
          }
        },
        ai_model: 'gpt-3.5-turbo'
      })
      .select()
      .single();

    if (taskError) {
      throw taskError;
    }

    // 异步开始生成过程，但使用await确保任务开始执行
    console.log(`开始异步生成试题，任务ID: ${task.id}`);
    // 使用Promise.resolve().then()确保异步执行但不阻塞当前请求
    Promise.resolve().then(async () => {
      try {
        await generateQuestions(task.id, material, {
          questionCount,
          questionTypes,
          difficulty,
          knowledgePoints
        });
        console.log(`试题生成完成，任务ID: ${task.id}`);
      } catch (error) {
        console.error(`试题生成失败，任务ID: ${task.id}:`, error);
      }
    });

    res.json({
      success: true,
      data: {
        id: task.id, // 使用id字段而不是taskId，与前端期望一致
        status: task.status,
        progress: task.parameters?.progress || 0
      }
    });
  } catch (error) {
    console.error('创建生成任务失败:', error);
    res.status(500).json({
      success: false,
      error: '创建生成任务失败'
    });
  }
});

// 获取任务状态
router.get('/tasks/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: task, error } = await supabase
      .from('generation_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // 如果任务完成，从任务结果中获取生成的试题数据
    let questions = [];
    if (task.status === 'completed' && task.result?.questions) {
      questions = task.result.questions;
    }

    res.json({
      success: true,
      data: {
        id: task.id,
        status: task.status,
        progress: task.parameters?.progress || 0,
        questionCount: task.parameters?.questionCount || 0,
        generatedCount: questions.length,
        questions,
        error: task.result?.error,
        createdAt: task.created_at,
        completedAt: task.completed_at
      }
    });
  } catch (error) {
    console.error('获取任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取任务状态失败'
    });
  }
});

// 获取任务详情和生成的试题
router.get('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: task, error } = await supabase
      .from('generation_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // 从任务结果中获取生成的试题数据
    const questions = task.result?.questions || [];

    res.json({
      success: true,
      data: {
        ...task,
        result: {
          ...task.result,
          questions: questions
        }
      }
    });
  } catch (error) {
    console.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取任务详情失败'
    });
  }
});

// 获取所有生成任务
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { data: tasks, error } = await supabase
      .from('generation_tasks')
      .select(`
        *,
        materials(title)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: tasks || []
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取任务列表失败'
    });
  }
});

// 重新生成试题
router.post('/tasks/:id/regenerate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { questionIds } = req.body;

    // 获取任务信息
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .select(`
        *,
        materials(*)
      `)
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // 如果指定了特定试题ID，删除这些试题
    if (questionIds && questionIds.length > 0) {
      await supabase
        .from('questions')
        .delete()
        .in('id', questionIds);
    }

    // 更新任务状态
    await supabase
      .from('generation_tasks')
      .update({
        status: 'pending',
        progress: 0,
        error_message: null
      })
      .eq('id', id);

    // 重新开始生成
    generateQuestions(id, task.materials, {
      questionCount: questionIds ? questionIds.length : task.question_count,
      questionTypes: task.question_types,
      difficulty: task.difficulty,
      knowledgePoints: task.knowledge_points
    });

    res.json({
      success: true,
      message: '重新生成已开始'
    });
  } catch (error) {
    console.error('重新生成失败:', error);
    res.status(500).json({
      success: false,
      error: '重新生成失败'
    });
  }
});

// 异步生成试题函数
async function generateQuestions(
  taskId: string,
  material: any,
  options: {
    questionCount: number;
    questionTypes: string[];
    difficulty: string;
    knowledgePoints?: any[];
  }
) {
  try {
    console.log(`开始生成试题，任务ID: ${taskId}，教材ID: ${material.id}，题目数量: ${options.questionCount}`);
    console.log(`教材内容长度: ${(material.content || material.text_content || '').length} 字符`);
    console.log(`AI服务状态: ${JSON.stringify(aiService.getStatus())}`);

    // 检查任务是否已经存在并处于进行中
    const { data: existingTask } = await supabase
      .from('generation_tasks')
      .select('status, progress')
      .eq('id', taskId)
      .single();
    
    // 如果任务已经完成或失败，不再处理
    if (existingTask && ['completed', 'failed'].includes(existingTask.status)) {
      console.log(`任务 ${taskId} 已经处于 ${existingTask.status} 状态，不再处理`);
      return;
    }

    // 更新任务状态为进行中（使用'processing'而不是'in_progress'，与数据库约束一致）
    // 首先获取当前的parameters
    const { data: currentTask, error: fetchError } = await supabase
      .from('generation_tasks')
      .select('parameters')
      .eq('id', taskId)
      .single();
      
    if (fetchError) {
      console.error(`获取任务 ${taskId} 参数失败:`, fetchError);
      throw new Error(`获取任务参数失败: ${fetchError.message}`);
    }
    
    // 更新parameters中的progress字段
    const updatedParameters = { ...currentTask.parameters, progress: 10 };
    
    const updateResult = await supabase
      .from('generation_tasks')
      .update({
        status: 'processing',
        parameters: updatedParameters
      })
      .eq('id', taskId);
      
    if (updateResult.error) {
      console.error(`更新任务 ${taskId} 状态失败:`, updateResult.error);
      throw new Error(`更新任务状态失败: ${updateResult.error.message}`);
    } else {
      console.log(`任务 ${taskId} 状态已更新为 processing，进度: 10%`);
    }

    const { questionCount, questionTypes, difficulty, knowledgePoints } = options;
    const generatedQuestions = [];

    // 获取知识点信息
    let knowledgePointsData = [];
    if (knowledgePoints && knowledgePoints.length > 0) {
      const { data } = await supabase
        .from('knowledge_points')
        .select('*')
        .in('id', knowledgePoints);
      knowledgePointsData = data || [];
    }

    // 使用AI服务生成试题
    for (let i = 0; i < questionCount; i++) {
      const questionType = questionTypes[i % questionTypes.length] as '单选题' | '多选题' | '判断题';
      const currentKnowledgePoint = knowledgePointsData[i % knowledgePointsData.length];
      
      try {
        const question = await aiService.generateQuestion({
          content: material.content || material.text_content || '',
          questionType,
          difficulty: mapDifficulty(difficulty),
          knowledgePoint: currentKnowledgePoint?.title
        });

        if (question) {
          // 只生成试题数据，不保存到数据库
          // 试题将在用户点击"提交审核"时才保存到数据库
          const questionData = {
            id: `temp_${Date.now()}_${i}`, // 临时ID，用于前端显示
            task_id: taskId,
            type: questionType, // 前端期望的字段名
            question_type: questionType, // 后端数据库字段名
            difficulty: mapDifficulty(difficulty),
            stem: question.stem,
            options: question.options,
            correctAnswer: question.correct_answer, // 前端期望的字段名
            correct_answer: question.correct_answer, // 后端数据库字段名
            analysis: question.analysis,
            qualityScore: question.quality_score || 0.5, // 前端期望的字段名
            quality_score: question.quality_score || 0.5, // 后端数据库字段名
            knowledge_point_id: currentKnowledgePoint?.id || null,
            knowledgeLevel: 'HR掌握', // 前端期望的字段名
            knowledge_level: 'HR掌握', // 后端数据库字段名
            status: 'pending', // 临时状态，实际保存时会设置为ai_reviewing
            created_at: new Date().toISOString()
          };
          
          generatedQuestions.push(questionData);
        }
      } catch (error) {
        console.error(`生成第${i + 1}道试题失败:`, error);
        // 继续生成其他试题
      }

      // 更新进度
      const progress = Math.floor(((i + 1) / questionCount) * 80) + 10;
      
      // 首先获取当前的parameters
      const { data: currentTask, error: fetchError } = await supabase
        .from('generation_tasks')
        .select('parameters')
        .eq('id', taskId)
        .single();
        
      if (fetchError) {
        console.error(`获取任务 ${taskId} 参数失败:`, fetchError);
        continue; // 继续生成下一题
      }
      
      // 更新parameters中的progress字段
      const updatedParameters = { ...currentTask.parameters, progress };
      
      const progressUpdateResult = await supabase
        .from('generation_tasks')
        .update({ parameters: updatedParameters })
        .eq('id', taskId);
        
      if (progressUpdateResult.error) {
        console.error(`更新任务 ${taskId} 进度失败:`, progressUpdateResult.error);
      } else {
        console.log(`任务 ${taskId} 进度已更新为 ${progress}%`);
      }
    }

    // 完成任务
    // 首先获取当前的parameters
    const { data: completedTask, error: completedFetchError } = await supabase
      .from('generation_tasks')
      .select('parameters')
      .eq('id', taskId)
      .single();
      
    if (completedFetchError) {
      console.error(`获取任务 ${taskId} 参数失败:`, completedFetchError);
      throw new Error(`获取任务参数失败: ${completedFetchError.message}`);
    }
    
    // 更新parameters中的progress字段
    const completedParameters = { ...completedTask.parameters, progress: 100 };
    
    const completeUpdateResult = await supabase
      .from('generation_tasks')
      .update({
        status: 'completed',
        parameters: completedParameters,
        completed_at: new Date().toISOString(),
        result: {
          generated_count: generatedQuestions.length,
          success_rate: (generatedQuestions.length / questionCount) * 100,
          questions: generatedQuestions // 将生成的试题数据存储在任务结果中
        }
      })
      .eq('id', taskId);
      
    if (completeUpdateResult.error) {
      console.error(`更新任务 ${taskId} 完成状态失败:`, completeUpdateResult.error);
      throw new Error(`更新任务完成状态失败: ${completeUpdateResult.error.message}`);
    } else {
      console.log(`任务 ${taskId} 已完成，状态已更新为 completed，进度: 100%，生成了 ${generatedQuestions.length} 道题目`);
    }

  } catch (error) {
    console.error('生成试题失败:', error);
    
    // 更新任务状态为失败
    try {
      // 首先获取当前的parameters
      const { data: failedTask, error: failedFetchError } = await supabase
        .from('generation_tasks')
        .select('parameters')
        .eq('id', taskId)
        .single();
        
      if (failedFetchError) {
        console.error(`获取任务 ${taskId} 参数失败:`, failedFetchError);
      } else {
        // 更新parameters中的progress字段
        const failedParameters = { ...failedTask.parameters, progress: 0 };
        
        const failUpdateResult = await supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            parameters: failedParameters,
            result: {
              error: error instanceof Error ? error.message : '生成失败',
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', taskId);
          
        if (failUpdateResult.error) {
          console.error(`更新任务 ${taskId} 失败状态失败:`, failUpdateResult.error);
        } else {
          console.log(`任务 ${taskId} 已标记为失败，状态已更新为 failed`);
        }
      }
    } catch (updateError) {
      console.error(`更新任务 ${taskId} 失败状态时出错:`, updateError);
    }
  }
}

// 映射难度级别
function mapDifficulty(difficulty: string): '易' | '中' | '难' {
  const difficultyMap: { [key: string]: '易' | '中' | '难' } = {
    'easy': '易',
    'medium': '中',
    'hard': '难',
    '简单': '易',
    '中等': '中',
    '困难': '难'
  };
  
  return difficultyMap[difficulty] || '中';
}

// 获取AI服务状态
router.get('/ai-status', async (req: Request, res: Response) => {
  try {
    // 设置缓存控制头，确保前端获取最新状态
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const status = aiService.getStatus();
    console.log('AI服务状态查询:', JSON.stringify(status, null, 2));
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取AI服务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取AI服务状态失败'
    });
  }
});

// 测试AI生成功能
router.post('/test-generate', async (req: Request, res: Response) => {
  try {
    const { content = '这是测试内容', questionType = '单选题', difficulty = '易' } = req.body;
    
    console.log(`开始测试AI生成，内容长度: ${content.length}，题型: ${questionType}，难度: ${difficulty}`);
    console.log(`AI服务状态: ${JSON.stringify(aiService.getStatus())}`);
    
    const question = await aiService.generateQuestion({
      content,
      questionType: questionType as '单选题' | '多选题' | '判断题',
      difficulty: difficulty as '易' | '中' | '难',
      knowledgePoint: '测试知识点'
    });
    
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('测试AI生成失败:', error);
    res.status(500).json({
      success: false,
      error: '测试AI生成失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;