/**
 * 检查环境变量配置脚本
 * 用于验证生产环境中的关键环境变量是否正确设置
 */

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'AI_PROVIDER',
  'DMXAPI_API_KEY',
  'DMXAPI_MODEL',
  'NODE_ENV'
];

const optionalEnvVars = [
  'PORT',
  'DOUBAO_API_KEY',
  'DOUBAO_MODEL',
  'DEEPSEEK_API_KEY', 
  'DEEPSEEK_MODEL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL'
];

console.log('=== 环境变量检查 ===\n');

let hasErrors = false;

// 检查必需的环境变量
console.log('必需的环境变量:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: 未设置`);
    hasErrors = true;
  } else {
    // 对敏感信息进行脱敏显示
    const displayValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? value.substring(0, 8) + '***' 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n可选的环境变量:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes('KEY') 
      ? value.substring(0, 8) + '***' 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`⚠️  ${varName}: 未设置`);
  }
});

// 特殊检查
console.log('\n=== 特殊检查 ===');

// JWT_SECRET 强度检查
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  if (jwtSecret.length < 32) {
    console.log('⚠️  JWT_SECRET 长度建议至少32位以确保安全性');
  } else {
    console.log('✅ JWT_SECRET 长度符合安全要求');
  }
} else {
  console.log('❌ JWT_SECRET 未设置，这将导致认证功能无法正常工作');
  hasErrors = true;
}

// Supabase URL 格式检查
const supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.log('⚠️  SUPABASE_URL 应该以 https:// 开头');
}

// AI Provider 配置检查
const aiProvider = process.env.AI_PROVIDER;
if (aiProvider) {
  const providerKey = `${aiProvider.toUpperCase()}_API_KEY`;
  if (!process.env[providerKey]) {
    console.log(`⚠️  AI_PROVIDER 设置为 ${aiProvider}，但缺少对应的 ${providerKey}`);
  } else {
    console.log(`✅ AI_PROVIDER ${aiProvider} 配置完整`);
  }
}

console.log('\n=== 检查结果 ===');
if (hasErrors) {
  console.log('❌ 发现配置错误，请检查上述未设置的必需环境变量');
  process.exit(1);
} else {
  console.log('✅ 所有必需的环境变量都已正确设置');
  process.exit(0);
}