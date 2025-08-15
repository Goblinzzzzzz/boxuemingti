import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 使用我们创建的测试用户ID
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

console.log('Generated JWT Token:');
console.log(token);
console.log('\nUse this token in Authorization header:');
console.log(`Bearer ${token}`);