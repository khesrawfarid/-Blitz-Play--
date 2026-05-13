const { Chess } = require('chess.js');
const c = new Chess();
try {
  c.move({ from: 'e2', to: 'e4', promotion: undefined });
  console.log('Success');
} catch (e) {
  console.error('Error:', e.message);
}
