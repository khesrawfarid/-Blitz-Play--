const { Chess } = require('chess.js');
const c = new Chess();
try {
  let moves = c.moves({ square: 'e2', verbose: true });
  console.log('moves length:', moves.length);
  if (moves.length > 0) console.log(moves[0]);
} catch (e) {
  console.error('Error:', e.message);
}
