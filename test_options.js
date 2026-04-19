import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate-game',
  method: 'OPTIONS'
}, (res) => {
  console.log('OPTIONS status:', res.statusCode);
});
req.end();
