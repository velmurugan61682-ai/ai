const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'dist', 'index.html');
  }
  const content = fs.readFileSync(filePath);
  res.writeHead(200);
  res.end(content);
});

server.listen(4173, () => {
  console.log('Server started on 4173');
  http.get('http://localhost:4173/', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('HTTP GET / Status:', res.statusCode);
      console.log('Has root div:', data.includes('<div id="root"></div>'));
      console.log('Has bundle script tag:', data.includes('/_expo/static/js/web/'));
      server.close();
      process.exit(0);
    });
  });
});

