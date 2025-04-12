import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './App.css';
import Popup from './components/Popup';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface GameState {
  board: string[];
  currentPlayer: string;
  winner: string | null;
  gameOver: boolean;
  players: { id: string; symbol: string; name: string }[];
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(''),
    currentPlayer: 'X',
    winner: null,
    gameOver: false,
    players: [],
  });
  const [playerId, setPlayerId] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [inputGameId, setInputGameId] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Popup-States
  const [createGamePopupOpen, setCreateGamePopupOpen] = useState<boolean>(false);
  const [joinGamePopupOpen, setJoinGamePopupOpen] = useState<boolean>(false);
  const [gameIdToJoin, setGameIdToJoin] = useState<string>('');

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('gameState', (state: GameState) => {
      setGameState(state);
    });

    newSocket.on('playerId', (id: string) => {
      setPlayerId(id);
    });

    newSocket.on('gameId', (id: string) => {
      setGameId(id);
    });

    newSocket.on('error', (message: string) => {
      setError(message);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');
    if (gameIdFromUrl) {
      setInputGameId(gameIdFromUrl);
      joinGame(gameIdFromUrl);
    }

    return () => {
      newSocket.close();
    };
  }, []);

  const handleCellClick = (index: number) => {
    if (socket && !gameState.gameOver && gameState.board[index] === '') {
      socket.emit('makeMove', { gameId, playerId, position: index });
    }
  };

  const createNewGame = () => {
    // Wenn bereits ein Spiel läuft, starte es neu ohne Namensabfrage
    if (gameId && playerId && gameState.players.length === 2) {
      if (socket) {
        socket.emit('restartGame', { gameId });
      }
    } else {
      // Ansonsten öffne das Popup für ein neues Spiel
      setCreateGamePopupOpen(true);
    }
  };

  const handleCreateGameSubmit = (playerName: string) => {
    if (playerName && socket) {
      socket.emit('createGame', { playerName });
      setCreateGamePopupOpen(false);
    }
  };

  const joinGame = (gameId: string) => {
    setGameIdToJoin(gameId);
    setJoinGamePopupOpen(true);
  };

  const handleJoinGameSubmit = (playerName: string) => {
    if (playerName && gameIdToJoin.trim() && socket) {
      socket.emit('joinGame', { gameId: gameIdToJoin.trim(), playerName });
      setJoinGamePopupOpen(false);
    }
  };

  return (
    <div className="app">
      <h1>Tic Tac Toe Multiplayer</h1>
      
      {error && <div className="error">{error}</div>}
      
      {/* Popups */}
      <Popup
        isOpen={createGamePopupOpen}
        onClose={() => setCreateGamePopupOpen(false)}
        onSubmit={handleCreateGameSubmit}
        title="Neues Spiel erstellen"
        placeholder="Bitte geben Sie Ihren Namen ein"
      />
      
      <Popup
        isOpen={joinGamePopupOpen}
        onClose={() => setJoinGamePopupOpen(false)}
        onSubmit={handleJoinGameSubmit}
        title="Einem Spiel beitreten"
        placeholder="Bitte geben Sie Ihren Namen ein"
      />
      
      {!gameId ? (
        <div className="game-setup">
          <div className="info-text">
            <h2>Willkommen zum Tic Tac Toe Multiplayer!</h2>
            <p>Erstelle ein neues Spiel oder tritt einem bestehenden Spiel bei.</p>
          </div>
          <button onClick={createNewGame}>Create New Game</button>
          <div className="join-game">
            <input
              type="text"
              placeholder="Enter Game ID"
              value={inputGameId}
              onChange={(e) => setInputGameId(e.target.value)}
            />
            <button onClick={() => joinGame(inputGameId)}>Join Game</button>
          </div>
        </div>
      ) : (
        <div className="game">
          <div className="game-info">
            <p>Game ID: {gameId}</p>
            {/* Spielernamen anzeigen */}
            <div className="player-info">
              {gameState.players.map((player, index) => (
                <p key={index} className={player.id === playerId ? 'current-player' : ''}>
                  Spieler {player.symbol}: {player.name} {player.id === playerId ? '(Du)' : ''}
                </p>
              ))}
            </div>
            
            {gameState.players.length < 2 ? (
              <p className="waiting-message">Warte auf zweiten Spieler...</p>
            ) : (
              <p className="current-turn">
                Am Zug: {gameState.players.find(p => p.symbol === gameState.currentPlayer)?.name} ({gameState.currentPlayer})
                {gameState.players.find(p => p.symbol === gameState.currentPlayer)?.id !== playerId && 
                  <span className="not-your-turn"> - Nicht dein Zug</span>}
              </p>
            )}
            
            {gameState.winner && (
              <p className="winner-message">
                {gameState.winner === 'draw' ? 'Unentschieden!' : 
                  `Gewinner: ${gameState.players.find(p => p.symbol === gameState.winner)?.name}`}
              </p>
            )}
          </div>
          
          <div className="board">
            {gameState.board.map((cell, index) => (
              <button
                key={index}
                className="cell"
                onClick={() => handleCellClick(index)}
                disabled={gameState.gameOver || gameState.players.length < 2 || 
                  gameState.players.find(p => p.symbol === gameState.currentPlayer)?.id !== playerId}
              >
                {cell}
              </button>
            ))}
          </div>
          
          {gameState.gameOver && (
            <button onClick={createNewGame}>Start New Game</button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
