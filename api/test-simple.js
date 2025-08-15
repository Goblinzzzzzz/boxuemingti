module.exports = (req, res) => {
  console.log('Simple API called:', req.method, req.url);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.status(200).json({
    success: true,
    message: 'Simple API works!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};