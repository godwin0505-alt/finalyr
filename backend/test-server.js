const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  console.log('Request received!');
  res.json({ message: 'Hello World!' });
});

app.listen(4000, '0.0.0.0', () => {
  console.log('Test server running on http://0.0.0.0:4000');
});
