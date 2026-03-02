export enum GameState {
  TITLE = 'TITLE',
  INTRO = 'INTRO',
  MENU = 'MENU',
  CONTROLS = 'CONTROLS',
  LEADERBOARD = 'LEADERBOARD',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
}

export type Language = 'EN' | 'ES';

export enum EntityType {
  ROCK = 'ROCK', // Cube
  MARBLE = 'MARBLE', // Sphere - Mobile Enemy
  TRASH = 'TRASH', // Irregular block - Static
  HOLE = 'HOLE', // Sewer hole
  WAVE = 'WAVE', // Jumpable
  PAPER = 'PAPER', // Collectible (Health)
  INSECT = 'INSECT', // Predictive Enemy
}

export interface Entity {
  id: number;
  type: EntityType;
  x: number; // 0 to 1 (screen position, calculated frame-by-frame)
  y: number; // vertical position relative to screen height
  width: number;
  height: number;
  active: boolean;
  color: string;
  vx: number; // Horizontal velocity (relative to track)
  offset: number; // Offset from track center (-0.5 to 0.5 roughly)
}

export type PlayerStatus = 'NORMAL' | 'FALLING' | 'RESPAWNING' | 'FINISHED';

export interface Player {
  x: number; // 0 to 1
  speed: number;
  maxSpeed: number;
  durability: number; // 0 to 100
  distance: number;
  isJumping: boolean;
  jumpHeight: number;
  jumpEnergy: number; // 0 to 100
  maxJumpEnergy: number; // 100
  invulnerable: number; // frames
  status: PlayerStatus;
  fallTimer: number;
  knockbackY: number; // For wave knockback effect
}

export interface Particle {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface HighScore {
  name: string;
  score: number;
  date: string;
}