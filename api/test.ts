import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Test API called:', req.method, req.url);
  
  res.status(200).json({
    message: 'Test API is working',
    method: req.method,
    timestamp: new Date().toISOString(),
    url: req.url
  });
}