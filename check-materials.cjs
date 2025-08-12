const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkMaterials() {
  const { data, error } = await supabase
    .from('materials')
    .select('id, title, content')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('查询失败:', error);
    return;
  }
  
  console.log('=== 所有教材检查 ===');
  data.forEach((m, index) => {
    console.log(`\n教材 ${index + 1}:`);
    console.log(`ID: ${m.id}`);
    console.log(`标题: ${m.title}`);
    console.log(`content长度: ${m.content ? m.content.length : 0}`);
    console.log(`content预览: ${m.content ? m.content.substring(0, 100) : '无内容'}...`);
    
    // 检查过滤条件
    const isValid = m.content && 
      m.content.length > 100 && 
      !m.content.includes('需要专门的解析库处理') &&
      !m.content.includes('ç¬¬äº');
    console.log(`是否有效: ${isValid}`);
  });
}

checkMaterials();