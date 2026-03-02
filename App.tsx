import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, HighScore, Language } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [score, setScore] = useState(0);
  const [durability, setDurability] = useState(100);
  const [jumpEnergy, setJumpEnergy] = useState(100);
  const [speed, setSpeed] = useState(0);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [language, setLanguage] = useState<Language>('EN');

  useEffect(() => {
    const saved = localStorage.getItem('paperBoatHighScores');
    if (saved) {
      try {
        setHighScores(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse high scores");
      }
    }
  }, []);

  const saveScore = (name: string) => {
    const newScore: HighScore = {
      name: name.trim() || 'Anonymous',
      score: Math.floor(score),
      date: new Date().toLocaleDateString()
    };
    
    // Sort and keep top 5
    const updated = [...highScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
      
    setHighScores(updated);
    localStorage.setItem('paperBoatHighScores', JSON.stringify(updated));
    setGameState(GameState.MENU);
  };

  const startGame = () => {
    setScore(0);
    setDurability(100);
    setSpeed(0);
    setGameState(GameState.PLAYING);
  };

  const togglePause = () => {
    setGameState(current => {
      if (current === GameState.PLAYING) return GameState.PAUSED;
      if (current === GameState.PAUSED) return GameState.PLAYING;
      return current;
    });
  };

  const resetGame = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-2 md:p-4 overflow-hidden">
      <div 
        className="relative w-full max-w-2xl max-h-screen"
        style={{ 
          maxWidth: 'min(100%, calc(100vh * 3 / 4))',
          aspectRatio: '3/4'
        }}
      >
        <GameCanvas
          gameState={gameState}
          setGameState={setGameState}
          setScore={setScore}
          setDurability={setDurability}
          setJumpEnergy={setJumpEnergy}
          setSpeedDisplay={setSpeed}
          togglePause={togglePause}
        />
        <UIOverlay
          gameState={gameState}
          setGameState={setGameState}
          score={score}
          durability={durability}
          jumpEnergy={jumpEnergy}
          speed={speed}
          startGame={startGame}
          resetGame={resetGame}
          highScores={highScores}
          onSaveScore={saveScore}
          togglePause={togglePause}
          language={language}
          setLanguage={setLanguage}
        />
      </div>
      
      {/* Footer / Instructions for desktop */}
      <div className="fixed bottom-4 right-4 text-gray-500 text-xs hidden lg:block font-mono">
        <p>Paper Boat Rush v1.1</p>
        <p>Uses React + Canvas API</p>
      </div>

      <audio 
        src="https://actions.google.com/sounds/v1/water/small_stream_flowing.ogg" 
        loop 
        ref={(audio) => {
            if (audio) {
                audio.volume = 0.3;
                if (gameState === GameState.TITLE) {
                    audio.play().catch(e => console.log("Audio play blocked", e));
                } else {
                    audio.pause();
                }
            }
        }}
      />
    </div>
  );
};

export default App;