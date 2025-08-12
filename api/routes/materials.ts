import express, { type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
// 直接从lib导入以避免测试文件问题
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import * as mammoth from 'mammoth';

const router = express.Router();

// 初始化Supabase客户端
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pnjibotdkfdvtfgqqakg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM'
);

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
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/octet-stream' // 添加对通用二进制类型的支持
    ];
    
    // 允许的文件扩展名
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    
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
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('开始处理文件上传请求...');
    
    if (!req.file) {
      console.log('错误：没有文件被上传');
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件'
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { title } = req.body;
    
    console.log(`文件信息: 名称=${originalname}, 类型=${mimetype}, 大小=${buffer.length}字节`);

    // 文本提取
    let content = '';
    try {
      // 获取文件扩展名
      const fileExtension = originalname.toLowerCase().substring(originalname.lastIndexOf('.'));
      
      if (mimetype === 'text/plain' || fileExtension === '.txt') {
        // 处理纯文本文件
        content = buffer.toString('utf-8');
        console.log(`成功解析文本文件: ${originalname}, 提取了 ${content.length} 个字符`);
      } else if (mimetype === 'application/pdf' || fileExtension === '.pdf') {
        // 处理PDF文件
        try {
          console.log(`开始解析PDF文件: ${originalname}, 大小: ${buffer.length} 字节`);
          
          // 检查文件名是否包含中文（可能导致编码问题）
          const hasChinese = /[\u4e00-\u9fa5]/.test(originalname);
          if (hasChinese) {
            console.warn(`警告: PDF文件名 ${originalname} 包含中文字符，可能导致编码问题`);
          }
          
          // 检查PDF文件头部标记
          const pdfHeader = buffer.slice(0, 5).toString();
          if (pdfHeader !== '%PDF-') {
            console.warn(`警告: 文件 ${originalname} 可能不是有效的PDF文件，头部标记不匹配: ${pdfHeader}`);
          }
          
          // 使用更多配置选项解析PDF
          const pdfData = await pdfParse(buffer, {
            // 设置PDF解析选项
            max: 0 // 不限制页数
            // 移除version配置，使用默认版本
            // 移除pagerender配置，使用默认渲染方式
          });
          
          content = pdfData.text || '';
          console.log(`成功解析PDF文件: ${originalname}, 提取了 ${content.length} 个字符`);
          
          // 检查内容是否包含乱码
          const invalidChars = (content.match(/�/g) || []).length;
          if (invalidChars > 0) {
            console.warn(`警告: PDF文件 ${originalname} 存在编码问题，包含 ${invalidChars} 个乱码字符`);
            
            // 尝试清理乱码字符
            const cleanedContent = content.replace(/�/g, '');
            if (cleanedContent.length > content.length * 0.7) { // 如果清理后内容保留了70%以上
              console.log(`已清理乱码字符，原始长度: ${content.length}，清理后长度: ${cleanedContent.length}`);
              content = cleanedContent;
            }
          }
          
          // 检查内容是否为空或过短
          if (content.length < 50) {
            console.warn(`警告: PDF文件 ${originalname} 提取的内容过短，可能解析失败`);
          }
        } catch (pdfError) {
          console.error(`PDF解析错误: ${originalname}`, pdfError);
          console.error(`PDF错误详情: ${pdfError instanceof Error ? pdfError.message : '未知错误'}`);
          console.error(`PDF错误堆栈: ${pdfError instanceof Error ? pdfError.stack : '无堆栈信息'}`);
          throw new Error(`PDF解析失败: ${pdfError instanceof Error ? pdfError.message : '未知错误'}`); // 包含更详细的错误信息
        }
      } else if (mimetype === 'application/msword' || 
                 mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                 fileExtension === '.doc' || fileExtension === '.docx') {
        // 处理Word文档
        try {
          console.log(`开始处理Word文档: ${originalname}, 大小: ${buffer.length} 字节`);
          
          if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // 处理.docx文件
            const result = await mammoth.extractRawText({ buffer });
            content = result.value || '';
            
            if (result.messages && result.messages.length > 0) {
              console.warn(`Word文档解析警告: ${originalname}`, result.messages);
            }
            
            console.log(`成功解析.docx文件: ${originalname}, 提取了 ${content.length} 个字符`);
          } else {
            // 处理.doc文件（旧格式）
            console.warn(`警告: ${originalname} 是旧版Word格式(.doc)，建议转换为.docx格式以获得更好的解析效果`);
            content = `Word文档: ${originalname}\n\n注意：系统目前不支持旧版Word格式(.doc)的内容提取，建议将文档转换为.docx格式、PDF或纯文本后上传，或使用文本输入方式。`;
          }
          
          // 检查内容是否为空或过短
          if (content.length < 10) {
            console.warn(`警告: Word文档 ${originalname} 提取的内容过短，可能解析失败`);
            content = `Word文档: ${originalname}\n\n提取的内容为空或过短，请检查文档是否包含有效文本内容，或尝试使用文本输入方式。`;
          }
          
          console.log(`Word文档处理完成: ${originalname}，提取了 ${content.length} 个字符`);
        } catch (wordError) {
          console.error(`Word文档处理错误: ${originalname}`, wordError);
          const errorMessage = wordError instanceof Error ? wordError.message : '未知错误';
          content = `Word文档: ${originalname}\n\n解析失败: ${errorMessage}\n\n建议将文档转换为PDF或纯文本后上传，或使用文本输入方式。`;
        }
      } else {
        // 对于其他不支持的格式，使用更友好的提示
        content = `文件: ${originalname}\n\n注意：系统目前不支持此文件格式的内容提取，建议将文档转换为PDF或纯文本后上传，或使用文本输入方式。`;
        console.log(`不支持的文件类型: ${mimetype}, 文件名: ${originalname}`);
      }

      // 确保内容不为空
      if (!content.trim()) {
        content = `无法提取 ${originalname} 的有效内容，请尝试使用文本方式输入`;
      }
    } catch (extractError) {
      console.error('文件内容提取失败:', extractError);
      // 记录更详细的错误信息
      const errorMessage = extractError instanceof Error ? extractError.message : '未知错误';
      const errorStack = extractError instanceof Error ? extractError.stack : '';
      console.error(`文件内容提取详细错误: ${errorMessage}`);
      if (errorStack) {
        console.error(`错误堆栈: ${errorStack}`);
      }
      
      // 设置错误内容
      content = `提取 ${originalname} 内容时出错，请尝试使用文本方式输入。错误信息: ${errorMessage}`;
    }

    // 处理文件类型，确保不超过数据库字段长度限制
    let fileType = mimetype;
    if (fileType.length > 20) {
      // 根据文件扩展名设置简短的文件类型
      const fileExtension = originalname.toLowerCase().substring(originalname.lastIndexOf('.'));
      switch (fileExtension) {
        case '.pdf':
          fileType = 'pdf';
          break;
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

    // 保存到数据库
    const { data, error } = await supabase
      .from('materials')
      .insert({
        title: title || originalname,
        content,
        file_type: fileType,
        file_path: originalname,
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
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { materialText, title } = req.body;

    if (!materialText) {
      return res.status(400).json({
        success: false,
        error: '请提供教材内容'
      });
    }

    // 保存文本内容到数据库
    const { data, error } = await supabase
      .from('materials')
      .insert({
        title: title || '文本输入教材',
        content: materialText,
        file_type: 'text',
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
router.get('/:id/knowledge-points', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 获取教材信息
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
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

// 获取所有教材
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('id, title, content, file_type, created_at, metadata')
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
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
router.put('/:id', async (req: Request, res: Response) => {
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
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`开始删除教材: ${id}`);
    
    // 首先检查教材是否存在
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, title')
      .eq('id', id)
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
    
    // 最后删除教材
    const { error: deleteMaterialError } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);

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