import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/BlitzPlayGame/api/generate-game',
  method: 'POST'
}, (res) => {
  console.log('blitzplay POST status:', res.statusCode);
});
req.end();
