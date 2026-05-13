const { Chess } = require('chess.js');
const c = new Chess();
try {
  let move = c.move({ from: 'e2', to: 'e4', promotion: undefined });
  console.log('first move:', move);
  
  // try fen
  const c2 = new Chess(c.fen());
  let move2 = c2.move({from: 'e7', to: 'e5'});
  console.log('second move fen:', c2.fen());

} catch (e) {
  console.error('Error:', e.message);
}
