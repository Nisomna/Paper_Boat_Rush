import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, HighScore, Language } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [score, setScore] = useState(0);
  const [durability, setDurability] = useState(100);
  const [jumpEnergy, setJumpEnergy] = useState(100);
  const [speed, setSpeed] = useState(0);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [language, setLanguage] = useState<Language>('EN');
  const [isMobile, setIsMobile] = useState(false);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

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
    <div className={`min-h-screen ${isMobile ? 'bg-[#1e3a8a]' : 'bg-black'} flex items-center justify-center overflow-hidden`} ref={containerRef}>
      <div 
        className="relative overflow-hidden shadow-2xl"
        style={{ 
          width: '100vw', 
          height: '100vh',
          maxWidth: `calc(100vh * (${CANVAS_WIDTH} / ${CANVAS_HEIGHT}))`,
          maxHeight: `calc(100vw * (${CANVAS_HEIGHT} / ${CANVAS_WIDTH}))`,
          margin: 'auto',
          borderRadius: isMobile ? '0' : '255px 15px 225px 15px/15px 225px 15px 255px',
          border: isMobile ? 'none' : 'solid 4px #374151',
          position: 'relative'
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
          keysPressed={keysPressed}
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
          keysPressed={keysPressed}
          toggleFullscreen={toggleFullscreen}
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