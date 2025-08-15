import express, { type Request, type Response } from 'express';
import { supabase } from '../services/supabaseClient';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { supabaseServer, successResponse, errorResponse, ApiResponse } from '../utils/supabase-server';
import multer from 'multer';
import { 
  optimizeMemoryUsage, 
  getVercelOptimizationSuggestions,
} from '../vercel-compatibility';
import { parseDocumentWithFallback } from '../vercel-compatibility';
import { PerformanceMonitor, enhancedErrorHandler } from '../vercel-optimization';

// 设置环境变量防止 pdf-parse 进入调试模式
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const router = express.Router();

// 依赖兼容性检查已移除，使用新的PDF解析方案

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/octet-stream' // 添加对通用二进制类型的支持
    ];
    
    // 允许的文件扩展名
    const allowedExtensions = ['.doc', '.docx', '.txt'];
    
    // 获取文件扩展名
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    console.log(`文件过滤器检查: 文件名=${file.originalname}, MIME类型=${file.mimetype}, 扩展名=${fileExtension}`);
    
    // 检查MIME类型或文件扩展名
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      console.log(`文件类型检查通过: ${file.originalname}`);
      cb(null, true);
    } else {
      console.log(`文件类型检查失败: ${file.originalname}, MIME=${file.mimetype}, 扩展名=${fileExtension}`);
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 上传教材文件
router.post('/upload', authenticateUser, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const uploadId = Date.now().toString(36);
  const monitor = new PerformanceMonitor(`文件上传-${uploadId}`);
  
  try {
    console.log(`[UPLOAD-${uploadId}] 开始处理文件上传请求...`);
    monitor.checkpoint('请求开始');
    
    // Vercel 环境优化检查
    if (process.env.VERCEL) {
      const suggestions = await getVercelOptimizationSuggestions();
      if (suggestions.suggestions && suggestions.suggestions.length > 0) {
        console.log(`[UPLOAD-${uploadId}] Vercel 优化建议:`, suggestions.suggestions);
      }
    }
    
    if (!req.file) {
      console.log(`[UPLOAD-${uploadId}] 错误：没有文件被上传`);
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件',
        uploadId
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { title } = req.body;
    
    console.log(`[UPLOAD-${uploadId}] 文件信息: 名称=${originalname}, 类型=${mimetype}, 大小=${buffer.length}字节`);
    monitor.checkpoint('文件信息获取');

    // 文本提取 - 使用降级处理的解析方法
    let content = '';
    try {
      console.log(`[UPLOAD-${uploadId}] 开始文本提取...`);
      monitor.checkpoint('文本提取开始');
      
      // 内存使用检查
      optimizeMemoryUsage();
      
      // 获取文件扩展名
      const fileExtension = originalname.toLowerCase().substring(originalname.lastIndexOf('.'));
      
      if (mimetype === 'text/plain' || fileExtension === '.txt') {
        // 处理纯文本文件
        content = buffer.toString('utf-8');
        console.log(`[UPLOAD-${uploadId}] 成功解析文本文件: ${originalname}, 提取了 ${content.length} 个字符`);
      } else {
        // 使用统一的文档解析函数处理所有文档类型
        content = await parseDocumentWithFallback(buffer, mimetype, originalname);
        console.log(`[UPLOAD-${uploadId}] 成功解析文档: ${originalname}, 提取了 ${content.length} 个字符`);
      }

      // 确保内容不为空
      if (!content.trim()) {
        content = `无法提取 ${originalname} 的有效内容，请尝试使用文本方式输入`;
      }
      
      monitor.checkpoint('文本提取完成');
      
      // 内存优化
      optimizeMemoryUsage();
    } catch (extractError) {
      console.error(`[UPLOAD-${uploadId}] 文件内容提取失败:`, extractError);
      enhancedErrorHandler(extractError, `文件提取-${uploadId}`);
      
      // 根据错误类型提供更具体的建议
      const errorMessage = extractError instanceof Error ? extractError.message : '未知错误';
      let userFriendlyMessage = '';
      
      if (errorMessage.includes('PDF内容提取不完整') || errorMessage.includes('扫描版PDF')) {
        userFriendlyMessage = 'PDF文档解析失败：该PDF可能是扫描版或图片格式，无法提取文字。建议使用OCR软件将PDF转换为可编辑文本，或使用文本输入方式。';
      } else if (errorMessage.includes('Word文档内容提取不完整') || errorMessage.includes('格式不支持') || errorMessage.includes('DOCX 解析失败')) {
        userFriendlyMessage = 'Word文档解析失败：文档格式可能不兼容或文件损坏。建议将Word文档另存为.docx格式，或将内容复制粘贴到文本输入框。';
      } else if (errorMessage.includes('文件大小超过限制')) {
        userFriendlyMessage = '文件解析失败：文件过大。建议压缩文档内容，分段上传或使用文本输入方式。';
      } else {
        userFriendlyMessage = '文档解析失败：请检查文件是否损坏或格式正确。建议转换为PDF或纯文本格式，或使用文本输入方式。';
      }
      
      // 抛出用户友好的错误信息，而不是保存错误信息到数据库
      throw new Error(userFriendlyMessage);
    }

    // 处理文件类型，确保不超过数据库字段长度限制
    let fileType = mimetype;
    if (fileType.length > 20) {
      // 根据文件扩展名设置简短的文件类型
      const fileExtension = originalname.toLowerCase().substring(originalname.lastIndexOf('.'));
      switch (fileExtension) {
        case '.doc':
          fileType = 'doc';
          break;
        case '.docx':
          fileType = 'docx';
          break;
        case '.txt':
          fileType = 'txt';
          break;
        default:
          fileType = 'unknown';
      }
    }

    // 保存到数据库，关联当前用户
    const { data, error } = await supabase
      .from('materials')
      .insert({
        title: title || originalname,
        content,
        file_type: fileType,
        file_path: originalname,
        created_by: req.user.id, // 关联当前用户
        metadata: {
          originalName: originalname,
          size: buffer.length,
          uploadTime: new Date().toISOString(),
          originalMimeType: mimetype // 保存原始MIME类型到metadata中
        }
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        title: data.title,
        content: data.content,
        fileType: data.file_type,
        metadata: data.metadata
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    
    // 记录更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`文件上传详细错误: ${errorMessage}`);
    if (errorStack) {
      console.error(`错误堆栈: ${errorStack}`);
    }
    
    // 返回更详细的错误信息
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      message: errorMessage,
      details: error instanceof Error ? error.toString() : '未知错误'
    });
  }
});

// 分析教材内容
router.post('/analyze', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { materialText, title } = req.body;

    if (!materialText) {
      return res.status(400).json({
        success: false,
        error: '请提供教材内容'
      });
    }

    // 保存文本内容到数据库，关联当前用户
    const { data, error } = await supabase
      .from('materials')
      .insert({
        title: title || '文本输入教材',
        content: materialText,
        file_type: 'text',
        created_by: req.user.id, // 关联当前用户
        metadata: {
          inputMethod: 'text',
          length: materialText.length,
          createTime: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 简单的内容分析
    const analysis = {
      wordCount: materialText.length,
      estimatedQuestions: Math.floor(materialText.length / 200), // 估算可生成试题数
      keyTopics: extractKeyTopics(materialText),
      knowledgePoints: identifyKnowledgePoints(materialText)
    };

    res.json({
      success: true,
      data: {
        id: data.id,
        title: data.title,
        content: data.content,
        analysis
      }
    });
  } catch (error) {
    console.error('教材分析失败:', error);
    res.status(500).json({
      success: false,
      error: '教材分析失败'
    });
  }
});

// 获取教材的知识点
router.get('/:id/knowledge-points', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 获取教材信息（只能访问自己的教材）
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .eq('created_by', req.user.id)
      .single();

    if (materialError || !material) {
      return res.status(404).json({
        success: false,
        error: '教材不存在'
      });
    }

    // 分析知识点
    const knowledgePoints = identifyKnowledgePoints(material.content);

    res.json({
      success: true,
      data: {
        materialId: id,
        title: material.title,
        knowledgePoints
      }
    });
  } catch (error) {
    console.error('获取知识点失败:', error);
    res.status(500).json({
      success: false,
      error: '获取知识点失败'
    });
  }
});

// 获取当前用户的教材列表
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('id, title, content, file_type, created_at, metadata')
      .eq('created_by', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('获取教材列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取教材列表失败'
    });
  }
});

// 获取单个教材详情
router.get('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .eq('created_by', req.user.id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: '教材不存在'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取教材详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取教材详情失败'
    });
  }
});

// 更新教材信息
router.put('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    if (!title && !content) {
      return res.status(400).json({
        success: false,
        error: '请提供要更新的字段'
      });
    }

    // 构建更新对象
    const updateData: {title?: string, content?: string} = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;

    const { data, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('更新教材失败:', error);
    res.status(500).json({
      success: false,
      error: '更新教材失败'
    });
  }
});

// 删除教材
router.delete('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`开始删除教材: ${id}`);
    
    // 首先检查教材是否存在且属于当前用户
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, title')
      .eq('id', id)
      .eq('created_by', req.user.id)
      .single();
    
    if (materialError || !material) {
      return res.status(404).json({
        success: false,
        error: '教材不存在'
      });
    }
    
    console.log(`找到教材: ${material.title}`);
    
    // 查找相关的生成任务
    const { data: tasks, error: tasksError } = await supabase
      .from('generation_tasks')
      .select('id')
      .eq('material_id', id);
    
    if (tasksError) {
      console.error('查询生成任务失败:', tasksError);
      throw tasksError;
    }
    
    console.log(`找到 ${tasks?.length || 0} 个相关的生成任务`);
    
    // 如果有相关的生成任务，先删除相关的试题
    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map(task => task.id);
      
      // 删除相关的试题
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .in('task_id', taskIds);
      
      if (questionsError) {
        console.error('删除相关试题失败:', questionsError);
        throw questionsError;
      }
      
      console.log(`删除了相关试题`);
      
      // 删除生成任务
      const { error: deleteTasksError } = await supabase
        .from('generation_tasks')
        .delete()
        .eq('material_id', id);
      
      if (deleteTasksError) {
        console.error('删除生成任务失败:', deleteTasksError);
        throw deleteTasksError;
      }
      
      console.log(`删除了 ${tasks.length} 个生成任务`);
    }
    
    // 最后删除教材（确保只删除自己的教材）
    const { error: deleteMaterialError } = await supabase
      .from('materials')
      .delete()
      .eq('id', id)
      .eq('created_by', req.user.id);

    if (deleteMaterialError) {
      console.error('删除教材失败:', deleteMaterialError);
      throw deleteMaterialError;
    }
    
    console.log(`成功删除教材: ${material.title}`);

    res.json({
      success: true,
      message: '教材删除成功'
    });
  } catch (error) {
    console.error('删除教材失败:', error);
    res.status(500).json({
      success: false,
      error: '删除教材失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 辅助函数：提取关键主题
function extractKeyTopics(content: string): string[] {
  const topics = [];
  
  // 简单的关键词匹配
  const keywords = [
    '人力资源管理', '岗位价值评估', '绩效管理', '组织设计',
    '薪酬管理', '培训开发', '员工关系', '招聘选拔'
  ];
  
  keywords.forEach(keyword => {
    if (content.includes(keyword)) {
      topics.push(keyword);
    }
  });
  
  return topics;
}

// 辅助函数：识别知识点
function identifyKnowledgePoints(content: string) {
  const knowledgePoints = [];
  
  // 基于内容识别知识点分级
  if (content.includes('人力资源管理')) {
    knowledgePoints.push({
      title: '人力资源管理基础',
      level: 'HR掌握',
      confidence: 0.9
    });
  }
  
  if (content.includes('岗位价值评估')) {
    knowledgePoints.push({
      title: '岗位价值评估',
      level: 'HR掌握',
      confidence: 0.85
    });
  }
  
  if (content.includes('绩效管理')) {
    knowledgePoints.push({
      title: '绩效管理',
      level: '全员掌握',
      confidence: 0.8
    });
  }
  
  return knowledgePoints;
}

export default router;