import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import './App.css';
import './i18n/i18n';
import Popup from './components/Popup';
import LanguageSelector from './components/LanguageSelector';

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
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string>('');
  
  // Popup-States
  const [createGamePopupOpen, setCreateGamePopupOpen] = useState<boolean>(false);
  const [joinGamePopupOpen, setJoinGamePopupOpen] = useState<boolean>(false);
  const [playerLeftPopupOpen, setPlayerLeftPopupOpen] = useState<boolean>(false);
  const [gameIdToJoin, setGameIdToJoin] = useState<string>('');
  
  const { t } = useTranslation();

  // Darkmode Toggle Funktion
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  // Prüfe Systemeinstellung für Darkmode
  useEffect(() => {
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDarkMode);
    
    // Listener für Änderungen der Systemeinstellung
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
    };
    
    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleDarkModeChange);
      return () => darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
    } else {
      // Fallback für ältere Browser
      darkModeMediaQuery.addListener(handleDarkModeChange);
      return () => darkModeMediaQuery.removeListener(handleDarkModeChange);
    }
  }, []);

  // Funktion zum Teilen der Game-ID
  const shareGameUrl = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?gameId=${gameId}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopySuccess(t('messages.copied'));
          setTimeout(() => setCopySuccess(''), 3000);
        })
        .catch(() => {
          setCopySuccess(t('messages.copyError'));
          setTimeout(() => setCopySuccess(''), 3000);
        });
    } else {
      // Fallback für Browser, die die Clipboard API nicht unterstützen
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(t('messages.copied'));
        setTimeout(() => setCopySuccess(''), 3000);
      } catch (err) {
        setCopySuccess(t('messages.copyError'));
        setTimeout(() => setCopySuccess(''), 3000);
      }
      document.body.removeChild(textArea);
    }
  };

  // Darkmode Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [darkMode]);

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
      
      // Wenn der andere Spieler die Verbindung getrennt hat
      if (message === 'Other player disconnected') {
        setPlayerLeftPopupOpen(true);
      }
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
  
  const handlePlayerLeftResponse = (response: string) => {
    setPlayerLeftPopupOpen(false);
    setError('');
    
    if (response === 'yes') {
      createNewGame();
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>{t('app.title')}</h1>
        <div className="header-controls">
          <LanguageSelector />
          <button 
            className="theme-toggle" 
            onClick={toggleDarkMode}
            aria-label={darkMode ? t('app.darkMode.dark') : t('app.darkMode.light')}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      
      {error && <div className="error">{error}</div>}
      {copySuccess && <div className="success-message">{copySuccess}</div>}
      
      {/* Popups */}
      <Popup
        isOpen={createGamePopupOpen}
        onClose={() => setCreateGamePopupOpen(false)}
        onSubmit={handleCreateGameSubmit}
        title={t('popup.createGame.title')}
        placeholder={t('popup.createGame.placeholder')}
      />
      
      <Popup
        isOpen={joinGamePopupOpen}
        onClose={() => setJoinGamePopupOpen(false)}
        onSubmit={handleJoinGameSubmit}
        title={t('popup.joinGame.title')}
        placeholder={t('popup.joinGame.placeholder')}
      />
      
      <Popup
        isOpen={playerLeftPopupOpen}
        onClose={() => setPlayerLeftPopupOpen(false)}
        onSubmit={handlePlayerLeftResponse}
        title={t('popup.playerLeft.title')}
        isConfirmation={true}
        confirmationMessage={t('popup.playerLeft.message')}
        confirmText={t('popup.yes')}
        cancelText={t('popup.no')}
      />
      
      {!gameId ? (
        <div className="game-setup">
          <div className="info-text">
            <h2>{t('game.welcome.title')}</h2>
            <p>{t('game.welcome.description')}</p>
          </div>
          <button onClick={createNewGame}>{t('game.createGame')}</button>
          <div className="join-game">
            <input
              type="text"
              placeholder={t('game.enterGameId')}
              value={inputGameId}
              onChange={(e) => setInputGameId(e.target.value)}
            />
            <button onClick={() => joinGame(inputGameId)}>{t('game.joinGame')}</button>
          </div>
        </div>
      ) : (
        <div className="game">
          <div className="game-info">
            <div className="game-id-container">
              <p>{t('game.gameId')}: {gameId}</p>
              <button 
                className="share-button" 
                onClick={shareGameUrl}
                title={t('game.share')}
              >
                {t('game.share')}
              </button>
            </div>
            {/* Spielernamen anzeigen */}
            <div className="player-info">
              {gameState.players.map((player, index) => (
                <p key={index} className={player.id === playerId ? 'current-player' : ''}>
                  {t('game.player')} {player.symbol}: {player.name} {player.id === playerId ? t('game.you') : ''}
                </p>
              ))}
            </div>
            
            {gameState.players.length < 2 ? (
              <p className="waiting-message">{t('game.waiting')}</p>
            ) : (
              <p className="current-turn">
                {t('game.currentTurn')}: {gameState.players.find(p => p.symbol === gameState.currentPlayer)?.name} ({gameState.currentPlayer})
                {gameState.players.find(p => p.symbol === gameState.currentPlayer)?.id !== playerId && 
                  <span className="not-your-turn">{t('game.notYourTurn')}</span>}
              </p>
            )}
            
            {gameState.winner && (
              <p className="winner-message">
                {gameState.winner === 'draw' ? t('game.draw') : 
                  `${t('game.winner')}: ${gameState.players.find(p => p.symbol === gameState.winner)?.name}`}
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
            <button onClick={createNewGame}>{t('game.startNewGame')}</button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
