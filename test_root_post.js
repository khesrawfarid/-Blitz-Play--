import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'POST'
}, (res) => {
  console.log('Root POST status:', res.statusCode);
});
req.end();
