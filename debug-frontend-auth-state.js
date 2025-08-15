// 前端权限状态检查脚本
// 用于检查用户zhaodan@ke.com登录后的前端状态和权限数据

console.log('🔍 前端权限状态检查开始...');
console.log('请在用户登录后在浏览器控制台运行此脚本');
console.log('='.repeat(50));

// 1. 检查localStorage中的认证数据
console.log('📱 1. 检查localStorage认证数据...');
const authData = {
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  user: localStorage.getItem('user'),
  authState: localStorage.getItem('auth-storage')
};

console.log('✅ localStorage数据:');
Object.entries(authData).forEach(([key, value]) => {
  if (value) {
    console.log(`   ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
  } else {
    console.log(`   ${key}: ❌ 未找到`);
  }
});

// 2. 检查Zustand store状态
console.log('\n🏪 2. 检查Zustand认证状态...');
try {
  // 尝试获取authStore状态
  const authStoreState = window.__ZUSTAND_STORE_STATE__ || {};
  console.log('✅ Zustand状态:', authStoreState);
} catch (error) {
  console.log('⚠️ 无法直接访问Zustand状态:', error.message);
}

// 3. 检查当前用户信息
console.log('\n👤 3. 检查当前用户信息...');
try {
  // 检查是否有全局的用户状态
  if (window.currentUser) {
    console.log('✅ 全局用户状态:', window.currentUser);
  } else {
    console.log('⚠️ 未找到全局用户状态');
  }
} catch (error) {
  console.log('❌ 获取用户状态失败:', error.message);
}

// 4. 检查权限相关的DOM元素
console.log('\n🎯 4. 检查菜单DOM元素...');
const menuItems = {
  '教材输入': document.querySelector('[href="/materials"]'),
  'AI生成工作台': document.querySelector('[href="/generate"]'),
  '试题审核': document.querySelector('[href="/review"]'),
  '用户管理': document.querySelector('[href="/users"]'),
  '系统管理': document.querySelector('[href="/system"]')
};

console.log('✅ 菜单元素检查:');
Object.entries(menuItems).forEach(([name, element]) => {
  if (element) {
    const isVisible = element.offsetParent !== null;
    console.log(`   ${name}: ${isVisible ? '✅ 可见' : '❌ 隐藏'} (元素存在)`);
  } else {
    console.log(`   ${name}: ❌ 元素不存在`);
  }
});

// 5. 检查网络请求
console.log('\n🌐 5. 检查最近的API请求...');
if (window.performance && window.performance.getEntriesByType) {
  const networkEntries = window.performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('/api/'))
    .slice(-10); // 最近10个API请求
  
  console.log('✅ 最近的API请求:');
  networkEntries.forEach(entry => {
    console.log(`   ${entry.name} - ${entry.responseStatus || 'unknown'}`);
  });
} else {
  console.log('⚠️ 无法获取网络请求信息');
}

// 6. 检查控制台错误
console.log('\n❌ 6. 检查控制台错误...');
console.log('请查看控制台是否有红色错误信息，特别是:');
console.log('   - 权限检查相关错误');
console.log('   - 网络请求失败');
console.log('   - JavaScript运行时错误');

// 7. 提供调试建议
console.log('\n💡 7. 调试建议...');
console.log('如果菜单仍然不显示，请尝试:');
console.log('   1. 清除浏览器缓存 (Ctrl+Shift+Delete)');
console.log('   2. 硬刷新页面 (Ctrl+Shift+R)');
console.log('   3. 退出登录后重新登录');
console.log('   4. 检查网络连接和API响应');

console.log('\n='.repeat(50));
console.log('🔍 前端权限状态检查完成');

// 8. 导出检查函数供手动调用
window.debugAuthState = function() {
  console.log('🔄 重新检查认证状态...');
  // 重新执行上述检查逻辑
  location.reload(); // 简单的重新加载页面
};

console.log('\n💻 可以调用 debugAuthState() 重新检查状态');