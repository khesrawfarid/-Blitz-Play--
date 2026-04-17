import http from 'http';

http.get('http://localhost:3000', (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    console.log("HEADERS:", res.headers);
    console.log("BODY:", rawData.slice(0, 1000));
  });
});
