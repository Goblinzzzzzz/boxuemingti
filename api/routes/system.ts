import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { supabase } from '../services/supabaseClient';

const router = express.Router();

// 获取系统配置
router.get('/config', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: config, error } = await supabase
      .from('system_config')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('获取系统配置失败:', error);
      return res.status(500).json({ success: false, message: '获取系统配置失败' });
    }

    // 如果没有配置记录，返回默认配置
    const defaultConfig = {
      siteName: '明题智能题库系统',
      siteDescription: '基于AI的智能题库管理系统',
      maxFileSize: 10,
      allowedFileTypes: ['pdf', 'doc', 'docx', 'txt'],
      enableRegistration: true,
      enableEmailVerification: false,
      sessionTimeout: 24,
      maxLoginAttempts: 5
    };

    res.json({
      success: true,
      config: config || defaultConfig
    });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 更新系统配置
router.put('/config', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const configData = req.body;
    
    // 检查是否已存在配置
    const { data: existingConfig } = await supabase
      .from('system_config')
      .select('id')
      .single();

    let result;
    if (existingConfig) {
      // 更新现有配置
      result = await supabase
        .from('system_config')
        .update({
          ...configData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id);
    } else {
      // 创建新配置
      result = await supabase
        .from('system_config')
        .insert({
          ...configData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    if (result.error) {
      console.error('保存系统配置失败:', result.error);
      return res.status(500).json({ success: false, message: '保存系统配置失败' });
    }

    res.json({ success: true, message: '系统配置保存成功' });
  } catch (error) {
    console.error('保存系统配置失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取系统日志
router.get('/logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, level, action } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (level) {
      query = query.eq('level', level);
    }

    if (action) {
      query = query.ilike('action', `%${action}%`);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('获取系统日志失败:', error);
      return res.status(500).json({ success: false, message: '获取系统日志失败' });
    }

    res.json({
      success: true,
      logs: logs || []
    });
  } catch (error) {
    console.error('获取系统日志失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 导出系统日志
router.get('/logs/export', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('导出系统日志失败:', error);
      return res.status(500).json({ success: false, message: '导出系统日志失败' });
    }

    // 生成CSV格式
    const csvHeader = 'ID,时间,级别,操作,用户,IP地址,详情\n';
    const csvContent = logs.map(log => 
      `${log.id},${log.created_at},${log.level},${log.action},${log.user_id || ''},${log.ip_address || ''},"${log.details || ''}"`
    ).join('\n');

    const csv = csvHeader + csvContent;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=system-logs-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csv); // 添加BOM以支持中文
  } catch (error) {
    console.error('导出系统日志失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 清空系统日志
router.delete('/logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { error } = await supabase
      .from('system_logs')
      .delete()
      .neq('id', 0); // 删除所有记录

    if (error) {
      console.error('清空系统日志失败:', error);
      return res.status(500).json({ success: false, message: '清空系统日志失败' });
    }

    // 记录清空日志的操作
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        action: '清空系统日志',
        user_id: req.user?.userId,
        ip_address: req.ip,
        details: '管理员清空了所有系统日志',
        created_at: new Date().toISOString()
      });

    res.json({ success: true, message: '系统日志清空成功' });
  } catch (error) {
    console.error('清空系统日志失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;