/**
 * 检查数据库中的教材记录
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseRecords() {
  try {
    console.log('🔍 检查数据库中的教材记录...');
    
    // 查询最近的教材记录
    const { data: materials, error } = await supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }
    
    console.log('✅ 最近5条教材记录:');
    console.log('=' .repeat(50));
    
    if (materials && materials.length > 0) {
      materials.forEach((item, index) => {
        console.log(`${index + 1}. ID: ${item.id}`);
        console.log(`   标题: ${item.title}`);
        console.log(`   内容长度: ${item.content ? item.content.length : 0} 字符`);
        console.log(`   文件类型: ${item.file_type || 'N/A'}`);
        console.log(`   创建者: ${item.created_by}`);
        console.log(`   创建时间: ${item.created_at}`);
        console.log(`   状态: ${item.status}`);
        if (item.metadata) {
          console.log(`   元数据: ${JSON.stringify(item.metadata, null, 2)}`);
        }
        console.log('---');
      });
    } else {
      console.log('📝 没有找到教材记录');
    }
    
    // 检查刚才上传的测试文档
    console.log('\n🔍 查找测试上传的文档...');
    const { data: testDocs, error: testError } = await supabase
      .from('materials')
      .select('*')
      .eq('title', '测试教材文档')
      .order('created_at', { ascending: false });
    
    if (testError) {
      console.error('❌ 查询测试文档失败:', testError);
    } else if (testDocs && testDocs.length > 0) {
      console.log(`✅ 找到 ${testDocs.length} 个测试文档:`);
      testDocs.forEach((doc, index) => {
        console.log(`${index + 1}. ID: ${doc.id}`);
        console.log(`   内容: ${doc.content}`);
        console.log(`   创建时间: ${doc.created_at}`);
      });
    } else {
      console.log('❌ 没有找到测试上传的文档');
    }
    
  } catch (error) {
    console.error('❌ 检查数据库记录失败:', error);
  }
}

checkDatabaseRecords();