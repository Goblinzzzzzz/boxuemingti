module.exports = (req, res) => {
  console.log('Hello API called');
  res.status(200).json({ message: 'Hello from Vercel API!', timestamp: new Date().toISOString() });
};