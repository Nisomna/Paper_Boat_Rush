import React, { useState, useEffect } from 'react';
import { GameState, HighScore, Language } from '../types';
import { GOAL_DISTANCE } from '../constants';
import { TRANSLATIONS } from '../translations';

interface UIOverlayProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  durability: number;
  jumpEnergy: number;
  speed: number;
  startGame: () => void;
  resetGame: () => void;
  highScores: HighScore[];
  onSaveScore: (name: string) => void;
  togglePause: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState,
  setGameState,
  score,
  durability,
  jumpEnergy,
  speed,
  startGame,
  resetGame,
  highScores,
  onSaveScore,
  togglePause,
  language,
  setLanguage,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [introStep, setIntroStep] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [titleText, setTitleText] = useState('');
  
  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (gameState === GameState.TITLE) {
      const fullTitle = t.TITLE;
      if (titleText.length < fullTitle.length) {
        const timeout = setTimeout(() => {
          setTitleText(fullTitle.substring(0, titleText.length + 1));
        }, 150);
        return () => clearTimeout(timeout);
      }
    } else if (gameState === GameState.INTRO) {
      const phrases = [t.INTRO_1, t.INTRO_2, t.INTRO_3];
      const currentPhrase = phrases[introStep];
      if (!currentPhrase) return;

      if (displayedText.length < currentPhrase.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentPhrase.substring(0, displayedText.length + 1));
        }, 50);
        return () => clearTimeout(timeout);
      }
    } else {
      setIntroStep(0);
      setDisplayedText('');
      setTitleText('');
    }
  }, [gameState, introStep, t, displayedText, titleText]);

  useEffect(() => {
    const handleKeyDown = () => {
      if (gameState === GameState.TITLE) {
        if (titleText.length < t.TITLE.length) {
          setTitleText(t.TITLE);
        } else {
          setGameState(GameState.INTRO);
        }
      } else if (gameState === GameState.INTRO) {
        const phrases = [t.INTRO_1, t.INTRO_2, t.INTRO_3];
        if (displayedText.length < phrases[introStep].length) {
          setDisplayedText(phrases[introStep]);
        } else {
          if (introStep < 2) {
            setIntroStep(prev => prev + 1);
            setDisplayedText('');
          } else {
            setGameState(GameState.MENU);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, introStep, displayedText, titleText, t, setGameState]);

  // Calculate progress percentage 0-100
  const progress = Math.min(100, Math.max(0, (score / GOAL_DISTANCE) * 100));

  if (gameState === GameState.PAUSED) {
      return (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-[#f4e4bc]/90 text-black z-50 p-4 backdrop-blur-sm"
          style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(163, 194, 224, 0.5) 31px, rgba(163, 194, 224, 0.5) 32px)',
              backgroundSize: '100% 32px',
              backgroundPosition: '0 16px',
          }}
        >
          <h2 className="text-5xl mb-8 retro-font text-blue-800 drop-shadow-md">{t.PAUSED}</h2>
          
          <div className="flex flex-col gap-4 w-full max-w-xs">
              <button
                onClick={togglePause}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 active:translate-y-1 transition-all retro-font text-xl shadow-lg"
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 3px #1e3a8a'
                }}
              >
                {t.RESUME}
              </button>
              
              <button
                onClick={resetGame}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-6 active:translate-y-1 transition-all retro-font text-xl shadow-lg"
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 3px #7f1d1d'
                }}
              >
                {t.QUIT_MENU}
              </button>
          </div>
        </div>
      );
  }

  if (gameState === GameState.TITLE) {
    const isTitleFinished = titleText.length === t.TITLE.length;
    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#f4e4bc] text-black z-50 p-4 text-center cursor-pointer"
        onClick={() => {
          if (!isTitleFinished) {
            setTitleText(t.TITLE);
          } else {
            setGameState(GameState.INTRO);
          }
        }}
        style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #a3c2e0 31px, #a3c2e0 32px)',
            backgroundSize: '100% 32px',
            backgroundPosition: '0 16px',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)'
        }}
      >
        <h1 className="text-5xl md:text-7xl text-blue-800 mb-6 retro-font tracking-widest uppercase drop-shadow-md min-h-[80px] flex items-center justify-center" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>
          {titleText}
        </h1>
        <p className={`text-gray-600 retro-font mt-10 transition-opacity duration-300 ${isTitleFinished ? 'opacity-100 animate-pulse' : 'opacity-0'}`}>
          {t.PRESS_ANY_KEY}
        </p>
      </div>
    );
  }

  if (gameState === GameState.INTRO) {
    const phrases = [t.INTRO_1, t.INTRO_2, t.INTRO_3];
    const isTypingFinished = displayedText.length === phrases[introStep]?.length;

    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#f4e4bc] text-black z-50 p-8 text-center cursor-pointer"
        onClick={() => {
          if (!isTypingFinished) {
            setDisplayedText(phrases[introStep]);
          } else {
            if (introStep < 2) {
              setIntroStep(prev => prev + 1);
              setDisplayedText('');
            } else {
              setGameState(GameState.MENU);
            }
          }
        }}
        style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #a3c2e0 31px, #a3c2e0 32px)',
            backgroundSize: '100% 32px',
            backgroundPosition: '0 16px',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)'
        }}
      >
        <div className="max-w-xl retro-font text-2xl md:text-3xl leading-relaxed text-gray-800 h-32 flex items-center justify-center" style={{ textShadow: '1px 1px 0 rgba(255,255,255,0.5)' }}>
            <p className="italic">{displayedText}</p>
        </div>
        <p className={`text-gray-500 retro-font mt-12 text-sm absolute bottom-10 transition-opacity duration-300 ${isTypingFinished ? 'opacity-100 animate-pulse' : 'opacity-0'}`}>
          {t.PRESS_ANY_KEY}
        </p>
      </div>
    );
  }

  if (gameState === GameState.CONTROLS) {
    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#f4e4bc] text-black z-50 p-4 text-center"
        style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #a3c2e0 31px, #a3c2e0 32px)',
            backgroundSize: '100% 32px',
            backgroundPosition: '0 16px',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)'
        }}
      >
        <h2 className="text-4xl text-blue-800 mb-8 retro-font drop-shadow-md">{t.CONTROLS}</h2>
        
        <div 
            className="w-full max-w-md bg-white/80 p-8 shadow-xl backdrop-blur-sm"
            style={{
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: 'solid 3px #3b82f6'
            }}
        >
          <div className="space-y-6 text-left text-lg font-mono text-gray-800 retro-font">
            <div className="flex items-center"><span className="w-16 font-bold text-blue-800 bg-blue-100 text-center mr-4 py-1 shadow-sm" style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', border: 'solid 2px #3b82f6' }}>W</span> {t.ACCELERATE}</div>
            <div className="flex items-center"><span className="w-16 font-bold text-blue-800 bg-blue-100 text-center mr-4 py-1 shadow-sm" style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', border: 'solid 2px #3b82f6' }}>S</span> {t.BRAKE}</div>
            <div className="flex items-center"><span className="w-16 font-bold text-blue-800 bg-blue-100 text-center mr-4 py-1 shadow-sm" style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', border: 'solid 2px #3b82f6' }}>A/D</span> {t.STEER}</div>
            <div className="flex items-center"><span className="w-16 font-bold text-blue-800 bg-blue-100 text-center mr-4 py-1 shadow-sm" style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', border: 'solid 2px #3b82f6' }}>SPC</span> {t.JUMP}</div>
          </div>
        </div>

        <button
            onClick={() => setGameState(GameState.MENU)}
            className="mt-8 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-8 active:translate-y-1 transition-all retro-font shadow-lg"
            style={{
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: 'solid 3px #4b5563'
            }}
        >
            {t.QUIT_MENU}
        </button>
      </div>
    );
  }

  if (gameState === GameState.MENU) {
    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#f4e4bc] text-black z-50 p-4 text-center"
        style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #a3c2e0 31px, #a3c2e0 32px)',
            backgroundSize: '100% 32px',
            backgroundPosition: '0 16px',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)'
        }}
      >
        <div className="absolute top-4 right-4 flex gap-2">
            <button 
                onClick={() => setLanguage('EN')} 
                className={`px-3 py-1 font-bold retro-font ${language === 'EN' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-600'}`}
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: `solid 2px ${language === 'EN' ? '#60a5fa' : '#4b5563'}`
                }}
            >
                EN
            </button>
            <button 
                onClick={() => setLanguage('ES')} 
                className={`px-3 py-1 font-bold retro-font ${language === 'ES' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-600'}`}
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: `solid 2px ${language === 'ES' ? '#60a5fa' : '#4b5563'}`
                }}
            >
                ES
            </button>
        </div>

        <h1 className="text-4xl md:text-6xl text-blue-800 mb-12 retro-font tracking-widest uppercase drop-shadow-md" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>
          {t.TITLE}
        </h1>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
            <button
                onClick={startGame}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 active:translate-y-1 transition-all retro-font text-xl shadow-lg"
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 3px #1e3a8a'
                }}
            >
                {t.PLAY}
            </button>

            <button
                onClick={() => setGameState(GameState.CONTROLS)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-6 active:translate-y-1 transition-all retro-font text-xl shadow-lg"
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 3px #581c87'
                }}
            >
                {t.CONTROLS}
            </button>

            <button
                onClick={() => setGameState(GameState.LEADERBOARD)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-6 active:translate-y-1 transition-all retro-font text-xl shadow-lg"
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 3px #14532d'
                }}
            >
                {t.LEADERBOARD}
            </button>

            <button
                onClick={() => setGameState(GameState.TITLE)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-6 active:translate-y-1 transition-all retro-font text-xl shadow-lg"
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 3px #7f1d1d'
                }}
            >
                {t.EXIT_GAME}
            </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.LEADERBOARD) {
    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#f4e4bc] text-black z-50 p-4 text-center"
        style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #a3c2e0 31px, #a3c2e0 32px)',
            backgroundSize: '100% 32px',
            backgroundPosition: '0 16px',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)'
        }}
      >
        <h2 className="text-4xl text-green-700 mb-8 retro-font drop-shadow-md">{t.LEADERBOARD}</h2>
        
        <div 
            className="w-full max-w-md bg-white/80 p-6 shadow-xl mb-8 backdrop-blur-sm"
            style={{
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: 'solid 3px #16a34a'
            }}
        >
           {highScores.length === 0 ? (
               <p className="text-gray-600 text-lg italic py-8 retro-font">{t.NO_RECORDS}</p>
           ) : (
               <ul className="text-lg font-mono space-y-3 retro-font">
                   {highScores.map((hs, i) => (
                       <li key={i} className="flex justify-between border-b border-gray-300 pb-2" style={{ borderBottomStyle: 'dashed' }}>
                           <span className="text-gray-800 font-bold">{i+1}. {hs.name}</span>
                           <span className="text-green-700 font-bold">{hs.score} {t.PTS}</span>
                       </li>
                   ))}
               </ul>
           )}
        </div>

        <button
            onClick={() => setGameState(GameState.MENU)}
            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-8 active:translate-y-1 transition-all retro-font shadow-lg"
            style={{
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: 'solid 3px #4b5563'
            }}
        >
            {t.QUIT_MENU}
        </button>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#fca5a5] text-black z-50 p-4"
        style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #ef4444 31px, #ef4444 32px)',
            backgroundSize: '100% 32px',
            backgroundPosition: '0 16px',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.3)'
        }}
      >
        <h2 
            className="text-5xl mb-4 retro-font text-red-800 bg-white/80 px-6 py-3 rotate-2 shadow-xl backdrop-blur-sm"
            style={{
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: 'solid 4px #b91c1c'
            }}
        >
            {t.GAME_OVER}
        </h2>
        <div className="text-3xl mb-2 font-mono retro-font text-red-900 font-bold bg-white/50 px-4 py-1 rounded-lg">{t.DISTANCE}: {Math.floor(score)}m</div>
        <div className="text-lg mb-8 text-red-800 retro-font font-bold">{t.GOAL}: {GOAL_DISTANCE}m</div>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
            <button
              onClick={resetGame}
              className="bg-red-700 text-white hover:bg-red-600 font-bold py-4 px-10 shadow-xl transform hover:scale-105 transition-transform retro-font text-xl"
              style={{
                  borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                  border: 'solid 3px #7f1d1d'
              }}
            >
              {t.TRY_AGAIN}
            </button>

            <button
              onClick={() => setGameState(GameState.LEADERBOARD)}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-10 shadow-xl transform hover:scale-105 transition-transform retro-font text-xl"
              style={{
                  borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                  border: 'solid 3px #14532d'
              }}
            >
              {t.LEADERBOARD}
            </button>

            <button
              onClick={() => setGameState(GameState.MENU)}
              className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-4 px-10 shadow-xl transform hover:scale-105 transition-transform retro-font text-xl"
              style={{
                  borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                  border: 'solid 3px #4b5563'
              }}
            >
              {t.QUIT_MENU}
            </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.VICTORY) {
    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#bbf7d0] text-black z-50 p-4"
        style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #22c55e 31px, #22c55e 32px)',
            backgroundSize: '100% 32px',
            backgroundPosition: '0 16px',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)'
        }}
      >
        <h2 
            className="text-4xl md:text-5xl mb-6 retro-font text-green-800 bg-white/80 px-8 py-4 shadow-xl backdrop-blur-sm -rotate-2"
            style={{
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: 'solid 4px #15803d'
            }}
        >
            {t.VICTORY}
        </h2>
        
        <div 
            className="bg-white/80 p-8 text-center mb-8 backdrop-blur-md shadow-xl"
            style={{
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: 'solid 3px #16a34a'
            }}
        >
            <div className="text-2xl mb-2 text-green-900 retro-font font-bold">{t.FINAL_SCORE}</div>
            <div className="text-5xl font-mono text-green-700 font-bold mb-6 retro-font drop-shadow-sm">{Math.floor(score)}</div>
            
            <div className="flex flex-col gap-2">
                <label className="text-sm uppercase tracking-widest text-green-800 retro-font font-bold">{t.ENTER_NAME}</label>
                <input 
                    type="text" 
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={10}
                    placeholder={t.PLAYER_1}
                    className="bg-green-50 p-3 text-center text-green-900 uppercase font-mono focus:outline-none retro-font text-xl shadow-inner"
                    style={{
                        borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                        border: 'solid 2px #15803d'
                    }}
                />
            </div>
        </div>

        <button
          onClick={() => onSaveScore(playerName)}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-10 shadow-lg active:translate-y-1 transition-all retro-font text-xl"
          style={{
              borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
              border: 'solid 3px #14532d'
          }}
        >
          {t.SAVE_RECORD}
        </button>
      </div>
    );
  }

  // HUD
  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-40">
      {/* Top Bar */}
      <div className="flex justify-between items-start h-[60vh]">
        {/* Left Side: Score & Speed */}
        <div className="flex flex-col gap-2">
             <div className="mt-2">
                <div className="text-4xl font-mono text-blue-900 retro-font drop-shadow-md font-bold">
                    {Math.floor(score)}<span className="text-xl">m</span>
                </div>
             </div>
             <div 
                className="bg-white/80 backdrop-blur-sm p-3 text-left w-32 mt-2 shadow-lg"
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 3px #3b82f6'
                }}
             >
               <div className="text-xs text-blue-800 uppercase tracking-widest retro-font font-bold">{t.SPEED}</div>
               <div className="text-2xl font-mono text-blue-900 retro-font font-bold">
                 {Math.floor(speed * 100)} <span className="text-sm text-blue-700">{t.KMH}</span>
               </div>
            </div>
        </div>

        {/* Right Side: Pause & Vertical Progress */}
        <div className="flex flex-col items-end gap-4 h-full">
            <button 
                onClick={togglePause}
                className="bg-white/80 hover:bg-gray-100 text-blue-900 p-2 pointer-events-auto shadow-lg"
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 3px #3b82f6'
                }}
                title="Pause Game"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>

             {/* Vertical Progress Bar */}
             <div 
                className="bg-white/80 backdrop-blur-md p-2 shadow-xl h-full flex flex-col items-center justify-between w-12 py-3 pointer-events-auto"
                style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 3px #3b82f6'
                }}
             >
                <div className="text-xl drop-shadow-md" title={t.EXIT}>🏁</div>
                
                <div 
                    className="relative w-3 flex-grow my-3 bg-gray-200 overflow-visible shadow-inner"
                    style={{
                        borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                        border: 'solid 2px #9ca3af'
                    }}
                >
                    {/* Filled part */}
                    <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-200 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                        style={{ 
                            height: `${progress}%`,
                            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px'
                        }}
                    />
                    {/* Boat Icon */}
                    <div 
                        className="absolute w-8 h-8 -left-2.5 transition-all duration-200 flex items-center justify-center text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10"
                        style={{ bottom: `calc(${progress}% - 16px)` }}
                    >
                        ⛵
                    </div>
                </div>
                
                <div 
                    className="w-3 h-3 bg-gray-600" 
                    style={{
                        borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                        border: 'solid 2px #9ca3af'
                    }}
                    title={t.START}
                ></div>
             </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex justify-center items-end pb-4 gap-8 px-8">
        {/* Durability Bar */}
        <div className="flex items-center w-full max-w-sm relative">
          {/* Icon */}
          <div className="absolute -left-6 z-10 text-4xl drop-shadow-md">
            ⛵
          </div>
          {/* Bar Container */}
          <div 
            className="w-full bg-white/90 p-2 pl-10 shadow-xl backdrop-blur-sm" 
            style={{ 
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: 'solid 3px #3b82f6'
            }}
          >
            <div className="flex justify-between text-[10px] text-blue-900 mb-1 uppercase font-bold tracking-wider retro-font pr-4">
              <span>{t.HULL_INTEGRITY}</span>
              <span>{Math.floor(durability)}%</span>
            </div>
            <div 
                className="h-6 w-[95%] bg-gray-200 relative overflow-hidden" 
                style={{ 
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 2px #9ca3af'
                }}
            >
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,#000_25%,#000_50%,transparent_50%,transparent_75%,#000_75%,#000_100%)] bg-[length:10px_10px] z-10"></div>
              <div
                className={`h-full transition-all duration-200 ${
                  durability < 30 ? 'bg-red-500 animate-pulse' : durability < 60 ? 'bg-yellow-400' : 'bg-green-500'
                }`}
                style={{ 
                    width: `${durability}%`,
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px'
                }}
              />
              <div className="absolute top-0 left-0 w-full h-2 bg-white/40 z-10" style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}></div>
            </div>
          </div>
        </div>

        {/* Jump Energy Bar */}
        <div className="flex items-center w-full max-w-sm relative">
          {/* Icon */}
          <div className="absolute -left-6 z-10 text-4xl drop-shadow-md">
            ⚡
          </div>
          {/* Bar Container */}
          <div 
            className="w-full bg-white/90 p-2 pl-10 shadow-xl backdrop-blur-sm" 
            style={{ 
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: 'solid 3px #3b82f6'
            }}
          >
            <div className="flex justify-between text-[10px] text-blue-900 mb-1 uppercase font-bold tracking-wider retro-font pr-4">
              <span>{t.JUMP_ENERGY}</span>
              <span>{Math.floor(jumpEnergy)}%</span>
            </div>
            <div 
                className="h-6 w-[95%] bg-gray-200 relative overflow-hidden" 
                style={{ 
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    border: 'solid 2px #9ca3af'
                }}
            >
               <div
                className="h-full transition-all duration-200 bg-blue-500"
                style={{ 
                    width: `${jumpEnergy}%`,
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px'
                }}
              />
              <div className="absolute top-0 left-0 w-full h-2 bg-white/40 z-10" style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;