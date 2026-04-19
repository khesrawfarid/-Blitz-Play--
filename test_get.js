import http from 'http';
http.get('http://localhost:3000/', (res) => {
  console.log("Status:", res.statusCode);
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('DATA:', data.substring(0, 100)));
});
