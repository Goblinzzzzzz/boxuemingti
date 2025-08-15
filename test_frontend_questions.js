// 测试前端题库管理页面是否正确加载审核通过的试题
import puppeteer from 'puppeteer';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const testUserId = '0df4f332-13ac-4821-97bd-9823c348359f';
const testEmail = 'testuser@example.com';

// 生成JWT token
const token = jwt.sign(
  {
    userId: testUserId,
    email: testEmail,
    roles: ['user']
  },
  JWT_SECRET,
  {
    expiresIn: '24h'
  }
);

async function testQuestionBankPage() {
  let browser;
  try {
    console.log('启动浏览器测试...');
    
    browser = await puppeteer.launch({ 
      headless: false, // 设置为false以便观察
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // 监听控制台输出
    page.on('console', msg => {
      console.log('浏览器控制台:', msg.text());
    });
    
    // 监听网络请求
    page.on('response', response => {
      if (response.url().includes('/api/questions')) {
        console.log(`API请求: ${response.url()} - 状态: ${response.status()}`);
      }
    });
    
    console.log('访问题库管理页面...');
    await page.goto('http://localhost:5173/question-bank', { waitUntil: 'networkidle0' });
    
    // 设置认证token到localStorage
    console.log('设置认证token...');
    await page.evaluate((token) => {
      localStorage.setItem('access_token', token);
    }, token);
    
    // 刷新页面以使用token
    console.log('刷新页面以加载数据...');
    await page.reload({ waitUntil: 'networkidle0' });
    
    // 等待页面加载完成
    await page.waitForTimeout(3000);
    
    // 检查页面标题
    const pageTitle = await page.$eval('h1', el => el.textContent);
    console.log('页面标题:', pageTitle);
    
    // 检查是否有试题数据
    const questionElements = await page.$$('[data-testid="question-item"], .question-item, .bg-white.rounded-lg.shadow');
    console.log(`找到 ${questionElements.length} 个试题元素`);
    
    // 检查统计信息
    try {
      const statsElements = await page.$$('.bg-white.rounded-lg.shadow p');
      if (statsElements.length > 0) {
        console.log('统计信息:');
        for (let i = 0; i < Math.min(statsElements.length, 10); i++) {
          const text = await statsElements[i].evaluate(el => el.textContent);
          if (text && text.trim()) {
            console.log(`  - ${text.trim()}`);
          }
        }
      }
    } catch (error) {
      console.log('无法获取统计信息:', error.message);
    }
    
    // 检查是否有试题列表
    try {
      const questionList = await page.$('.space-y-4, .grid, [class*="question"]');
      if (questionList) {
        console.log('✓ 找到试题列表容器');
        
        // 尝试获取试题内容
        const questionTexts = await page.$$eval('*', elements => {
          return elements
            .filter(el => el.textContent && el.textContent.includes('测试') && el.textContent.includes('题干'))
            .map(el => el.textContent.trim())
            .slice(0, 3); // 只取前3个
        });
        
        if (questionTexts.length > 0) {
          console.log('✓ 找到试题内容:');
          questionTexts.forEach((text, index) => {
            console.log(`  ${index + 1}. ${text.substring(0, 100)}...`);
          });
        } else {
          console.log('✗ 未找到试题内容');
        }
      } else {
        console.log('✗ 未找到试题列表容器');
      }
    } catch (error) {
      console.log('检查试题列表时出错:', error.message);
    }
    
    // 检查网络请求状态
    console.log('\n等待5秒以观察页面状态...');
    await page.waitForTimeout(5000);
    
    console.log('测试完成！');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testQuestionBankPage();