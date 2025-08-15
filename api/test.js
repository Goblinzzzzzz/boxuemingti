const { VercelRequest, VercelResponse } = require('@vercel/node');

module.exports = function handler(req, res) {
  console.log('Test API called:', req.method, req.url);
  
  res.status(200).json({
    message: 'Test API is working with CommonJS',
    method: req.method,
    timestamp: new Date().toISOString(),
    url: req.url
  });
};