/**
 * Supabase 连接验证器
 * 专门用于验证生产环境中的 Supabase 连接和权限配置
 */

import { supabase } from './services/supabaseClient';
// 移除有问题的vercel-logger依赖

export interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
  duration?: number;
  timestamp: string;
}

export interface SupabaseValidationReport {
  overall: ValidationResult;
  connection: ValidationResult;
  authentication: ValidationResult;
  permissions: ValidationResult;
  tables: ValidationResult;
  environment: ValidationResult;
  performance: {
    connectionTime: number;
    queryTime: number;
    totalTime: number;
  };
}

class SupabaseValidator {
  private static instance: SupabaseValidator;
  private validationId: string;

  constructor() {
    this.validationId = `validation-${Date.now().toString(36)}`;
  }

  static getInstance(): SupabaseValidator {
    if (!SupabaseValidator.instance) {
      SupabaseValidator.instance = new SupabaseValidator();
    }
    return SupabaseValidator.instance;
  }

  /**
   * 执行完整的 Supabase 验证
   */
  async validateComplete(): Promise<SupabaseValidationReport> {
    const startTime = Date.now();
    console.log(`[${this.validationId}] 开始 Supabase 完整验证`);

    const report: SupabaseValidationReport = {
      overall: { success: false, message: '', timestamp: new Date().toISOString() },
      connection: { success: false, message: '', timestamp: new Date().toISOString() },
      authentication: { success: false, message: '', timestamp: new Date().toISOString() },
      permissions: { success: false, message: '', timestamp: new Date().toISOString() },
      tables: { success: false, message: '', timestamp: new Date().toISOString() },
      environment: { success: false, message: '', timestamp: new Date().toISOString() },
      performance: {
        connectionTime: 0,
        queryTime: 0,
        totalTime: 0
      }
    };

    try {
      // 1. 验证环境变量
      report.environment = await this.validateEnvironment();
      
      // 2. 验证连接
      const connectionStart = Date.now();
      report.connection = await this.validateConnection();
      report.performance.connectionTime = Date.now() - connectionStart;
      
      // 3. 验证认证
      report.authentication = await this.validateAuthentication();
      
      // 4. 验证权限
      report.permissions = await this.validatePermissions();
      
      // 5. 验证表结构
      const queryStart = Date.now();
      report.tables = await this.validateTables();
      report.performance.queryTime = Date.now() - queryStart;
      
      // 计算总体结果
      const allTests = [report.environment, report.connection, report.authentication, report.permissions, report.tables];
      const successCount = allTests.filter(test => test.success).length;
      
      report.overall = {
        success: successCount === allTests.length,
        message: `验证完成: ${successCount}/${allTests.length} 项通过`,
        timestamp: new Date().toISOString()
      };
      
      report.performance.totalTime = Date.now() - startTime;
      
      console.log(`[${this.validationId}] Supabase 验证完成`, {
        success: report.overall.success,
        duration: report.performance.totalTime,
        results: {
          environment: report.environment.success,
          connection: report.connection.success,
          authentication: report.authentication.success,
          permissions: report.permissions.success,
          tables: report.tables.success
        }
      });
      
    } catch (error) {
      console.error(`[${this.validationId}] Supabase 验证过程中发生错误`, error);
      report.overall = {
        success: false,
        message: `验证过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error,
        timestamp: new Date().toISOString()
      };
    }

    return report;
  }

  /**
   * 验证环境变量配置
   */
  private async validateEnvironment(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const requiredVars = {
        'SUPABASE_URL': process.env.SUPABASE_URL,
        'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
        'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
      };
      
      const missingVars = [];
      const invalidVars = [];
      
      for (const [varName, value] of Object.entries(requiredVars)) {
        if (!value) {
          missingVars.push(varName);
        } else if (value.length < 20) {
          invalidVars.push(`${varName} (长度过短)`);
        }
      }
      
      // 验证 URL 格式
      if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
        invalidVars.push('SUPABASE_URL (格式无效)');
      }
      
      const issues = [...missingVars, ...invalidVars];
      
      if (issues.length === 0) {
        return {
          success: true,
          message: '环境变量配置正确',
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: `环境变量配置问题: ${issues.join(', ')}`,
          details: { missingVars, invalidVars },
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `环境变量验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 验证数据库连接
   */
  private async validateConnection(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // 测试基本连接
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        return {
          success: false,
          message: `数据库连接失败: ${error.message}`,
          details: error,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: true,
        message: '数据库连接正常',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: `连接测试异常: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 验证认证配置
   */
  private async validateAuthentication(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // 测试认证相关的查询
      const { data, error } = await supabase.auth.getSession();
      
      if (error && error.message.includes('Invalid API key')) {
        return {
          success: false,
          message: `认证配置错误: ${error.message}`,
          details: error,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: true,
        message: '认证配置正常',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: `认证验证异常: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 验证数据库权限
   */
  private async validatePermissions(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const tables = ['users', 'materials', 'questions', 'generation_tasks'];
      const permissionResults = [];
      
      for (const table of tables) {
        try {
          // 测试读取权限
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (error) {
            permissionResults.push({
              table,
              permission: 'read',
              success: false,
              error: error.message
            });
          } else {
            permissionResults.push({
              table,
              permission: 'read',
              success: true
            });
          }
        } catch (tableError) {
          permissionResults.push({
            table,
            permission: 'read',
            success: false,
            error: tableError instanceof Error ? tableError.message : '未知错误'
          });
        }
      }
      
      const failedPermissions = permissionResults.filter(result => !result.success);
      
      if (failedPermissions.length === 0) {
        return {
          success: true,
          message: '数据库权限正常',
          details: permissionResults,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: `权限验证失败: ${failedPermissions.length} 个表存在权限问题`,
          details: { failed: failedPermissions, all: permissionResults },
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `权限验证异常: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 验证表结构
   */
  private async validateTables(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const requiredTables = [
        'users',
        'materials', 
        'questions',
        'generation_tasks',
        'knowledge_points',
        'user_roles',
        'roles'
      ];
      
      const tableResults = [];
      
      for (const tableName of requiredTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(0); // 只检查表结构，不获取数据
          
          if (error) {
            tableResults.push({
              table: tableName,
              exists: false,
              error: error.message
            });
          } else {
            tableResults.push({
              table: tableName,
              exists: true
            });
          }
        } catch (tableError) {
          tableResults.push({
            table: tableName,
            exists: false,
            error: tableError instanceof Error ? tableError.message : '未知错误'
          });
        }
      }
      
      const missingTables = tableResults.filter(result => !result.exists);
      
      if (missingTables.length === 0) {
        return {
          success: true,
          message: '所有必需表都存在',
          details: tableResults,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: `缺少 ${missingTables.length} 个必需表`,
          details: { missing: missingTables, all: tableResults },
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `表结构验证异常: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 快速连接测试（用于健康检查）
   */
  async quickConnectionTest(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        return {
          success: false,
          message: `快速连接测试失败: ${error.message}`,
          details: error,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: true,
        message: '快速连接测试通过',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: `快速连接测试异常: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 导出单例实例
export const supabaseValidator = SupabaseValidator.getInstance();
export default supabaseValidator;