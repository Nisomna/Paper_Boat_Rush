export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 1000;
export const FPS = 60;

// Player Physics
export const ACCELERATION = 0.005;
export const BRAKING = 0.01;
export const FRICTION = 0.002;
export const MAX_SPEED = 1.2; // Screen height percentage per second roughly
export const BASE_SPEED = 0.2; // Constant current
export const TURN_SPEED = 0.02;
export const JUMP_DURATION = 40; // Frames
export const MAX_JUMP_ENERGY = 100;
export const JUMP_ENERGY_COST = 35;
export const JUMP_ENERGY_REGEN = 0.5;

// Game Balance
export const GOAL_DISTANCE = 50000; // Increased length significantly
export const DURABILITY_DRAIN = 0.03; // Per frame
export const COLLISION_PENALTY = 15;
export const FALL_PENALTY = 25;
export const PAPER_HEAL = 20;
export const HOLE_PENALTY = 25;
export const MIN_SPAWN_DISTANCE = 400; // Minimum distance between obstacle spawns

// Visuals
export const LANE_BORDER_WIDTH = 40; // Default visual width for static parts