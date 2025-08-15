export default function handler(req, res) {
  console.log('Hello API called with method:', req.method);
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(200).json({ 
    message: 'Hello from Vercel API!', 
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}