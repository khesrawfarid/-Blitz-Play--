import { Chess } from 'chess.js';

// Piece values
const pieceValues: Record<string, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 900
};

// Evaluate the board position
const evaluateBoard = (game: Chess): number => {
  let totalEvaluation = 0;
  const board = game.board();
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const val = pieceValues[piece.type] || 0;
        totalEvaluation += piece.color === 'w' ? val : -val;
      }
    }
  }
  return totalEvaluation;
};

// Minimax with Alpha-Beta Pruning
const minimax = (game: Chess, depth: number, alpha: number, beta: number, isMaximizingPlayer: boolean): number => {
  if (depth <= 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves();

  if (isMaximizingPlayer) {
    let bestVal = -Infinity;
    for (const move of moves) {
      game.move(move);
      bestVal = Math.max(bestVal, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
      game.undo();
      alpha = Math.max(alpha, bestVal);
      if (beta <= alpha) {
        break;
      }
    }
    return bestVal;
  } else {
    let bestVal = Infinity;
    for (const move of moves) {
      game.move(move);
      bestVal = Math.min(bestVal, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
      game.undo();
      beta = Math.min(beta, bestVal);
      if (beta <= alpha) {
        break;
      }
    }
    return bestVal;
  }
};

// Get the best move
export const getBestMove = (game: Chess, difficulty: 'easy' | 'medium' | 'hard'): string | null => {
  const possibleMoves = game.moves();
  if (possibleMoves.length === 0) return null;

  if (difficulty === 'easy') {
    // Random move
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    return possibleMoves[randomIndex];
  }

  const depth = difficulty === 'medium' ? 2 : 3; // depth 3 is hard, depth 2 is medium
  let bestMove = null;
  let bestValue = game.turn() === 'w' ? -Infinity : Infinity;

  const isMaximizing = game.turn() === 'w';

  // Shuffle moves slightly to ensure variety on equal evaluations
  possibleMoves.sort(() => Math.random() - 0.5);

  for (const move of possibleMoves) {
    game.move(move);
    const boardValue = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing);
    game.undo();

    if (isMaximizing) {
      if (boardValue > bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    } else {
      if (boardValue < bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    }
  }

  return bestMove || possibleMoves[0]; // fallback to first random move if somehow bestMove is null
};
