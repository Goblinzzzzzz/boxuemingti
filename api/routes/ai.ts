import express from 'express';
import { aiService } from '../services/aiService';
import { aiServiceManager } from '../services/aiServiceManager';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

/**
 * 获取AI服务状态
 */
router.get('/status', authenticateUser, (req, res) => {
  try {
    const status = aiService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('获取AI服务状态失败:', error);
    res.status(500).json({ 
      error: 'Failed to get AI service status',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取所有可用的AI提供商和模型
 */
router.get('/providers', authenticateUser, (req, res) => {
  try {
    const providers = aiService.getAllProviders();
    res.json({ providers });
  } catch (error) {
    console.error('获取AI提供商列表失败:', error);
    res.status(500).json({ 
      error: 'Failed to get AI providers',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 切换AI提供商和模型
 */
router.post('/switch', authenticateUser, (req, res) => {
  try {
    const { provider, model } = req.body;
    
    if (!provider) {
      return res.status(400).json({ 
        error: 'Provider is required',
        message: '请指定AI提供商'
      });
    }

    // 验证提供商和模型组合
    if (model && !aiServiceManager.validateProviderModel(provider, model)) {
      return res.status(400).json({ 
        error: 'Invalid provider-model combination',
        message: `提供商 ${provider} 不支持模型 ${model}`
      });
    }

    const success = aiService.switchProvider(provider, model);
    
    if (success) {
      const status = aiService.getStatus();
      res.json({ 
        success: true,
        message: `已切换到 ${provider}${model ? ` - ${model}` : ''}`,
        status
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: 'Failed to switch provider',
        message: '切换AI提供商失败，请检查配置'
      });
    }
  } catch (error) {
    console.error('切换AI提供商失败:', error);
    res.status(500).json({ 
      error: 'Failed to switch AI provider',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取指定提供商的详细信息
 */
router.get('/providers/:providerName', authenticateUser, (req, res) => {
  try {
    const { providerName } = req.params;
    const provider = aiServiceManager.getProviderConfig(providerName);
    
    if (!provider) {
      return res.status(404).json({ 
        error: 'Provider not found',
        message: `未找到提供商: ${providerName}`
      });
    }

    res.json({ provider });
  } catch (error) {
    console.error('获取提供商信息失败:', error);
    res.status(500).json({ 
      error: 'Failed to get provider info',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;