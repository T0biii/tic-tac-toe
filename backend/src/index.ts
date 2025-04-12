import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors());

interface Game {
  id: string;
  board: string[];
  currentPlayer: string;
  players: { id: string; symbol: string; name: string }[];
  winner: string | null;
  gameOver: boolean;
  restartVotes?: { [playerId: string]: boolean };
}

const games: Map<string, Game> = new Map();

const checkWinner = (board: string[]): string | null => {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (!board.includes('')) {
    return 'draw';
  }

  return null;
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createGame', ({ playerName }) => {
    // Generiere eine kürzere Game-ID mit 5 Zeichen
    const gameId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const game: Game = {
      id: gameId,
      board: Array(9).fill(''),
      currentPlayer: 'X',
      players: [{ id: socket.id, symbol: 'X', name: playerName }],
      winner: null,
      gameOver: false
    };
    games.set(gameId, game);
    
    // Join the socket room for this game
    socket.join(gameId);
    
    socket.emit('gameId', gameId);
    socket.emit('playerId', socket.id);
    socket.emit('gameState', game);
  });
  
  socket.on('voteRestart', ({ gameId, playerId }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    
    if (!game.gameOver) {
      socket.emit('error', 'Game is not over yet');
      return;
    }
    
    // Initialisiere restartVotes, falls es noch nicht existiert
    if (!game.restartVotes) {
      game.restartVotes = {};
    }
    
    // Spieler stimmt für Neustart
    game.restartVotes[playerId] = true;
    
    // Prüfe, ob alle Spieler für Neustart gestimmt haben
    const totalVotes = Object.keys(game.restartVotes).length;
    const totalPlayers = game.players.length;
    
    if (totalVotes === totalPlayers) {
      // Alle Spieler haben zugestimmt, Spiel zurücksetzen
      game.board = Array(9).fill('');
      game.currentPlayer = 'X';
      game.winner = null;
      game.gameOver = false;
      game.restartVotes = {}; // Zurücksetzen der Stimmen
    }
    
    // Aktualisiere das Spiel in der Map
    games.set(gameId, game);
    
    // Sende den aktualisierten Spielstatus an alle Spieler
    io.to(gameId).emit('gameState', game);
  });
  
  // Behalte die alte restartGame-Funktion für Kompatibilität
  socket.on('restartGame', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    
    // Initialisiere restartVotes, falls es noch nicht existiert
    if (!game.restartVotes) {
      game.restartVotes = {};
    }
    
    // Spieler stimmt für Neustart
    game.restartVotes[socket.id] = true;
    
    // Sende den aktualisierten Spielstatus an alle Spieler
    io.to(gameId).emit('gameState', game);
  });

  socket.on('joinGame', ({ gameId, playerName }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    if (game.players.length >= 2) {
      socket.emit('error', 'Game is full');
      return;
    }
    
    // Add the second player with O symbol
    game.players.push({ id: socket.id, symbol: 'O', name: playerName });
    
    // Join the socket room for this game
    socket.join(gameId);
    
    socket.emit('gameId', gameId);
    socket.emit('playerId', socket.id);
    socket.emit('gameState', game);
    io.to(gameId).emit('gameState', game);
  });

  socket.on('makeMove', ({ gameId, playerId, position }: { gameId: string; playerId: string; position: number }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    if (game.gameOver) {
      socket.emit('error', 'Game is over');
      return;
    }
    
    // Find the player making the move
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit('error', 'Player not found in this game');
      return;
    }
    
    // Check if it's the player's turn
    if (game.currentPlayer !== player.symbol) {
      socket.emit('error', 'Not your turn');
      return;
    }
    
    if (game.board[position] !== '') {
      socket.emit('error', 'Position already taken');
      return;
    }

    // Make the move
    game.board[position] = player.symbol;
    const winner = checkWinner(game.board);
    
    if (winner) {
      game.winner = winner;
      game.gameOver = true;
    } else {
      // Switch to the other player
      game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
    }

    // Broadcast the updated game state to all players in the room
    io.to(gameId).emit('gameState', game);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Markiere den Spieler als getrennt, aber behalte das Spiel
    for (const [gameId, game] of games.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        // Informiere andere Spieler, dass ein Spieler getrennt wurde
        io.to(gameId).emit('error', 'Other player disconnected');
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
