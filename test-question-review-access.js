import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 模拟前端权限检查逻辑
function hasPermission(userPermissions, requiredPermission) {
  return userPermissions.includes(requiredPermission)
}

function hasAnyPermission(userPermissions, requiredPermissions) {
  return requiredPermissions.some(permission => userPermissions.includes(permission))
}

// 模拟ProtectedRoute权限检查
function checkRouteAccess(userPermissions, routeConfig) {
  if (routeConfig.requiredPermissions && routeConfig.requiredPermissions.length > 0) {
    return hasAnyPermission(userPermissions, routeConfig.requiredPermissions)
  }
  return true
}

async function testQuestionReviewAccess() {
  console.log('=== 测试试题审核页面访问权限 ===')
  console.log()

  try {
    // 1. 获取测试用户的权限
    console.log('1. 获取用户权限数据...')
    
    // 获取tangx66@ke.com用户信息
    const { data: tangxUserInfo, error: tangxUserError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'tangx66@ke.com')
      .single()

    if (tangxUserError) {
      console.error('❌ 获取tangx66@ke.com用户信息失败:', tangxUserError.message)
      return
    }

    // 获取用户角色
    const { data: tangxRoles, error: tangxRolesError } = await supabase
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', tangxUserInfo.id)

    // 获取用户权限（通过角色）
    const tangxRoleIds = tangxRoles?.map(r => r.role_id) || []
    let tangxPermissions = []
    
    if (tangxRoleIds.length > 0) {
      const { data: permissions, error: tangxPermError } = await supabase
        .from('role_permissions')
        .select('permission_id, permissions(name)')
        .in('role_id', tangxRoleIds)
      
      tangxPermissions = permissions || []
    }

    const tangxUser = {
      email: tangxUserInfo.email,
      roles: tangxRoles?.map(r => r.roles.name) || [],
      permissions: tangxPermissions?.map(p => p.permissions.name) || []
    }

    // 获取管理员用户（查找admin角色的用户）
    const { data: adminRoleUsers, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id, users(email, name), roles(name)')
      .eq('roles.name', 'admin')
      .limit(1)

    let adminUser = null
    if (!adminError && adminRoleUsers && adminRoleUsers.length > 0) {
      const adminUserInfo = adminRoleUsers[0]
      
      // 获取管理员权限（通过角色）
      const { data: adminRoleInfo } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', adminUserInfo.user_id)
      
      const adminRoleIds = adminRoleInfo?.map(r => r.role_id) || []
      let adminPermissions = []
      
      if (adminRoleIds.length > 0) {
        const { data: permissions } = await supabase
          .from('role_permissions')
          .select('permission_id, permissions(name)')
          .in('role_id', adminRoleIds)
        
        adminPermissions = permissions || []
      }

      adminUser = {
        email: adminUserInfo.users.email,
        roles: ['admin'],
        permissions: adminPermissions?.map(p => p.permissions.name) || []
      }
    }



    console.log('✅ 用户权限数据获取完成')
    console.log()

    // 2. 测试试题审核路由权限检查
    console.log('2. 测试试题审核路由权限检查...')
    
    const questionReviewRouteConfig = {
      requireAuth: true,
      requiredPermissions: ['questions.review']
    }

    // 测试tangx66@ke.com用户
    console.log('\n测试用户: tangx66@ke.com')
    console.log('用户角色:', tangxUser.roles)
    console.log('用户权限:', tangxUser.permissions)
    
    const tangxCanAccess = checkRouteAccess(tangxUser.permissions, questionReviewRouteConfig)
    console.log(`试题审核页面访问权限: ${tangxCanAccess ? '✅ 允许' : '❌ 拒绝'}`)
    
    if (tangxCanAccess) {
      console.log('✅ tangx66@ke.com 可以访问试题审核页面')
    } else {
      console.log('❌ tangx66@ke.com 无法访问试题审核页面')
      console.log('缺少权限:', questionReviewRouteConfig.requiredPermissions.filter(p => !tangxUser.permissions.includes(p)))
    }

    // 测试管理员用户（如果存在）
    if (adminUser) {
      console.log('\n测试管理员用户:', adminUser.email)
      console.log('用户角色:', adminUser.roles)
      console.log('用户权限:', adminUser.permissions)
      
      const adminCanAccess = checkRouteAccess(adminUser.permissions, questionReviewRouteConfig)
      console.log(`试题审核页面访问权限: ${adminCanAccess ? '✅ 允许' : '❌ 拒绝'}`)
      
      if (adminCanAccess) {
        console.log('✅ 管理员可以访问试题审核页面')
      } else {
        console.log('❌ 管理员无法访问试题审核页面')
        console.log('缺少权限:', questionReviewRouteConfig.requiredPermissions.filter(p => !adminUser.permissions.includes(p)))
      }
    }

    console.log()
    console.log('3. 测试其他相关路由权限...')
    
    // 测试其他路由的权限配置
    const routeConfigs = {
      '/material-input': { requiredPermissions: ['materials.create'] },
      '/ai-generator': { requiredPermissions: ['questions.generate'] },
      '/question-review': { requiredPermissions: ['questions.review'] }
    }

    console.log('\ntangx66@ke.com 路由访问权限:')
    for (const [route, config] of Object.entries(routeConfigs)) {
      const canAccess = checkRouteAccess(tangxUser.permissions, config)
      console.log(`  ${route}: ${canAccess ? '✅ 允许' : '❌ 拒绝'}`)
    }

    if (adminUser) {
      console.log(`\n${adminUser.email} 路由访问权限:`)
      for (const [route, config] of Object.entries(routeConfigs)) {
        const canAccess = checkRouteAccess(adminUser.permissions, config)
        console.log(`  ${route}: ${canAccess ? '✅ 允许' : '❌ 拒绝'}`)
      }
    }

    console.log()
    console.log('=== 测试总结 ===')
    
    const allTestsPassed = tangxCanAccess && (!adminUser || checkRouteAccess(adminUser.permissions, questionReviewRouteConfig))
    
    if (allTestsPassed) {
      console.log('✅ 所有权限测试通过')
      console.log('✅ 试题审核权限配置正确')
      console.log('✅ 普通用户和管理员都可以访问试题审核页面')
    } else {
      console.log('❌ 权限测试失败')
      console.log('❌ 需要检查权限配置')
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }
}

// 运行测试
testQuestionReviewAccess().catch(console.error)