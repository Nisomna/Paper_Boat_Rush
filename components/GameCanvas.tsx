import React, { useRef, useEffect, useCallback } from 'react';
import rough from 'roughjs/bin/rough';
import { GameState, Entity, Player, EntityType, Particle, PlayerStatus, FloatingText } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MAX_SPEED,
  ACCELERATION,
  BRAKING,
  FRICTION,
  TURN_SPEED,
  BASE_SPEED,
  DURABILITY_DRAIN,
  PAPER_HEAL,
  HOLE_PENALTY,
  FALL_PENALTY,
  JUMP_DURATION,
  MAX_JUMP_ENERGY,
  JUMP_ENERGY_COST,
  JUMP_ENERGY_REGEN,
  GOAL_DISTANCE,
  MIN_SPAWN_DISTANCE,
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  setDurability: (val: number) => void;
  setJumpEnergy: (val: number) => void;
  setSpeedDisplay: (val: number) => void;
  togglePause: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  setScore,
  setDurability,
  setJumpEnergy,
  setSpeedDisplay,
  togglePause,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const frameCountRef = useRef<number>(0);
  const lastSpawnDistRef = useRef<number>(0);

  // Game State Refs
  const playerRef = useRef<Player>({
    x: 0.5,
    speed: 0,
    maxSpeed: MAX_SPEED,
    durability: 100,
    distance: 0,
    isJumping: false,
    jumpHeight: 0,
    jumpEnergy: 100,
    maxJumpEnergy: 100,
    invulnerable: 0,
    status: 'NORMAL',
    fallTimer: 0,
    knockbackY: 0,
  });
  const entitiesRef = useRef<Entity[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<Particle[]>([]);
  const wakeParticlesRef = useRef<{x: number, y: number, life: number, maxLife: number, size: number}[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef = useRef<number>(0);
  const jumpFrameRef = useRef<number>(0);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        togglePause();
        return;
      }

      keysPressed.current[e.code] = true;
      if (e.code === 'Space' && gameState === GameState.PLAYING && playerRef.current.status === 'NORMAL' && !playerRef.current.isJumping) {
        if (playerRef.current.jumpEnergy >= JUMP_ENERGY_COST) {
            playerRef.current.isJumping = true;
            playerRef.current.jumpEnergy -= JUMP_ENERGY_COST;
            jumpFrameRef.current = JUMP_DURATION;
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, togglePause]);

  // Reset Game Logic
  const initGame = useCallback(() => {
    playerRef.current = {
      x: 0.5,
      speed: 0,
      maxSpeed: MAX_SPEED,
      durability: 100,
      distance: 0,
      isJumping: false,
      jumpHeight: 0,
      jumpEnergy: 100,
      maxJumpEnergy: 100,
      invulnerable: 0,
      status: 'NORMAL',
      fallTimer: 0,
      knockbackY: 0,
    };
    entitiesRef.current = [];
    particlesRef.current = [];
    wakeParticlesRef.current = [];
    floatingTextsRef.current = [];
    screenShakeRef.current = 0;
    lastSpawnDistRef.current = 0;
    
    // Initial Rain
    for(let i=0; i<50; i++) {
        particlesRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            speed: 15 + Math.random() * 10,
            length: 10 + Math.random() * 20,
            opacity: 0.3 + Math.random() * 0.3
        });
    }
  }, []);

  const prevGameStateRef = useRef<GameState>(gameState);

  useEffect(() => {
    // Only init game if we are coming from MENU or GAME_OVER, not PAUSED.
    if (gameState === GameState.PLAYING && prevGameStateRef.current !== GameState.PAUSED) {
      initGame();
    }
    prevGameStateRef.current = gameState;
  }, [gameState, initGame]);

  // --- Track Generation Logic ---
  const getTrackBounds = (dist: number) => {
     // Check if near goal (Exit Tunnel)
     const distToGoal = GOAL_DISTANCE - dist;
     
     // Sewer Exit Logic
     if (dist > GOAL_DISTANCE) {
         // Widening path at the exit
         const exitFactor = Math.min(1, (dist - GOAL_DISTANCE) / 800);
         return {
             left: 0.1 - (exitFactor * 0.1),
             right: 0.9 + (exitFactor * 0.1),
             hasWalls: true, // Walls exist but are wide
             centerX: 0.5,
             width: 0.8 + (exitFactor * 0.2),
             isExit: true
         };
     }

     // Normal Procedural Generation
     const curve = Math.sin(dist * 0.002) * 0.35 + Math.sin(dist * 0.005) * 0.15;
     
     let width = 0.65 + Math.sin(dist * 0.0015) * 0.15;
     
     // Tighter sections
     if ((dist > 5000 && dist < 7000) || (dist > 15000 && dist < 18000) || (dist > 35000 && dist < 38000)) {
         width = 0.35; 
     }

     // Dangerous sections with no walls (Gaps)
     let hasWalls = true;
     if (
         (dist > 10000 && dist < 12000) || 
         (dist > 25000 && dist < 28000) || 
         (dist > 42000 && dist < 45000)
     ) {
         hasWalls = false;
     }

     const centerX = 0.5 + (curve * 0.4); 
     
     return {
         left: centerX - width / 2,
         right: centerX + width / 2,
         hasWalls,
         centerX,
         width,
         isExit: false
     };
  };

  // Main Loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameState === GameState.PLAYING) {
      updatePhysics();
      updateEntities();
      checkCollisions();
    }

    draw(ctx);
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // --- Physics ---

  const updatePhysics = () => {
    const p = playerRef.current;

    // Finish Line Logic
    if (p.distance >= GOAL_DISTANCE + 800) { // Drive slightly past 
        setGameState(GameState.VICTORY);
        return;
    }

    // Handle Falling State
    if (p.status === 'FALLING') {
        p.fallTimer--;
        p.speed *= 0.95; 
        if (p.fallTimer <= 0) {
            // Respawn
            p.status = 'RESPAWNING';
            p.invulnerable = 120; 
            p.durability -= FALL_PENALTY;
            
            const track = getTrackBounds(p.distance);
            p.x = track.centerX;
            p.speed = 0;
            
            if (p.durability <= 0) setGameState(GameState.GAME_OVER);
        }
        return;
    }

    if (p.status === 'RESPAWNING') {
        if (p.invulnerable <= 0) p.status = 'NORMAL';
    }

    // Knockback decay
    if (p.knockbackY > 0) {
        p.knockbackY -= 2;
        if (p.knockbackY < 0) p.knockbackY = 0;
    }

    // Determine Ground Friction based on "Water" vs "Concrete" (Exit)
    const onDryLand = p.distance > GOAL_DISTANCE;
    
    // Normal Movement
    let maxSpeed = onDryLand ? MAX_SPEED * 0.5 : MAX_SPEED; // Slower on land
    let currentFriction = onDryLand ? FRICTION * 4 : FRICTION; // More friction on land

    if (keysPressed.current['KeyW'] && !onDryLand) {
        if (p.speed < maxSpeed) p.speed += ACCELERATION;
    } else {
        // Coasting
        if (!onDryLand) {
           if (p.speed > BASE_SPEED) p.speed -= currentFriction;
           if (p.speed < BASE_SPEED) p.speed += ACCELERATION;
        } else {
           // Decelerate naturally on land to a stop
           p.speed -= 0.02;
           if(p.speed < 0) p.speed = 0;
           // Auto drive a bit if too slow to reach victory trigger
           if(p.speed === 0 && p.distance < GOAL_DISTANCE + 800) {
               p.speed = 0.2;
           }
        }
    }

    if (keysPressed.current['KeyS']) {
        p.speed -= BRAKING;
        if (p.speed < 0) p.speed = 0;
    }

    if (keysPressed.current['KeyA']) p.x -= TURN_SPEED;
    if (keysPressed.current['KeyD']) p.x += TURN_SPEED;

    // Wake particles
    if (!onDryLand && p.speed > 0.5 && Math.random() < 0.3) {
        wakeParticlesRef.current.push({
            x: p.x * CANVAS_WIDTH + (Math.random() - 0.5) * 20,
            y: CANVAS_HEIGHT * 0.8 + 20,
            life: 30,
            maxLife: 30,
            size: 2 + Math.random() * 4
        });
    }

    // Update wake particles
    wakeParticlesRef.current.forEach(wp => {
        wp.y += p.speed * 5;
        wp.life--;
    });
    wakeParticlesRef.current = wakeParticlesRef.current.filter(wp => wp.life > 0);

    // Update floating texts
    floatingTextsRef.current.forEach(ft => {
        ft.y -= 1;
        ft.life--;
    });
    floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0);

    // Track Boundaries Collision
    const track = getTrackBounds(p.distance);
    const playerHalfWidth = 0.025; 

    // --- LEFT WALL CHECK ---
    if (p.x - playerHalfWidth < track.left) {
        if (track.hasWalls) {
            // WALL HIT: Clamp position, do NOT fall.
            p.x = track.left + playerHalfWidth;
            p.durability -= 0.02; // Minor scrape damage
            // Optional: slight speed loss
            // p.speed *= 0.98; 
        } else if (!p.isJumping) {
            // GAP HIT: Fall
            p.status = 'FALLING';
            p.fallTimer = 60;
        }
    }
    
    // --- RIGHT WALL CHECK ---
    if (p.x + playerHalfWidth > track.right) {
        if (track.hasWalls) {
            // WALL HIT: Clamp position, do NOT fall.
            p.x = track.right - playerHalfWidth;
            p.durability -= 0.02; // Minor scrape damage
        } else if (!p.isJumping) {
            // GAP HIT: Fall
            p.status = 'FALLING';
            p.fallTimer = 60;
        }
    }

    // Jump Logic
    if (p.isJumping) {
      jumpFrameRef.current--;
      const totalJumpFrames = JUMP_DURATION;
      const progress = (totalJumpFrames - jumpFrameRef.current) / totalJumpFrames;
      p.jumpHeight = Math.sin(progress * Math.PI) * 1.5; 

      if (jumpFrameRef.current <= 0) {
        p.isJumping = false;
        p.jumpHeight = 0;
      }
    }

    p.distance += p.speed * 12; 
    
    // Constant Drain (only in water)
    if (p.speed > 0.1 && !onDryLand) p.durability -= DURABILITY_DRAIN;

    if (p.durability <= 0) {
      setGameState(GameState.GAME_OVER);
    }
    
    if (p.invulnerable > 0) p.invulnerable--;

    // Regen Jump Energy
    if (!p.isJumping && p.jumpEnergy < p.maxJumpEnergy) {
        p.jumpEnergy = Math.min(p.maxJumpEnergy, p.jumpEnergy + JUMP_ENERGY_REGEN);
    }

    // UI Updates
    if (frameCountRef.current % 10 === 0) {
        setScore(p.distance);
        setDurability(p.durability);
        setJumpEnergy(p.jumpEnergy);
        setSpeedDisplay(p.speed);
    }
    frameCountRef.current++;
  };

  const spawnEntity = () => {
    // Don't spawn entities if near goal
    if (playerRef.current.distance > GOAL_DISTANCE - 1000) return;

    if (playerRef.current.distance - lastSpawnDistRef.current < MIN_SPAWN_DISTANCE) return;

    const lookAheadDist = playerRef.current.distance + (CANVAS_HEIGHT * 1.5);
    const trackAtSpawn = getTrackBounds(lookAheadDist);
    
    const difficultyMultiplier = 1 + Math.floor(playerRef.current.distance / 5000) * 0.2;
    const spawnChance = 0.02 * difficultyMultiplier;

    if (Math.random() < spawnChance) {
      lastSpawnDistRef.current = playerRef.current.distance;

      const margin = 0.1;
      const usableWidthFactor = 1.0 - (2 * margin);
      const spawnWidth = trackAtSpawn.width;
      // Store offset as RELATIVE position (-0.5 to 0.5) within the track width
      // This ensures that as the track narrows/widens, the entity stays in its relative lane.
      let relativeOffset = (Math.random() - 0.5) * usableWidthFactor; 

      const missingHealth = 100 - playerRef.current.durability;
      const paperBonus = (missingHealth / 100) * 0.40; 
      const paperThreshold = 0.05 + paperBonus; 

      const roll = Math.random();
      let type = EntityType.ROCK;
      let w = 40, h = 40, col = '#718096', vx = 0;

      if (roll < paperThreshold) {
          type = EntityType.PAPER; w=30; h=30; col='#F6E05E';
      } else {
          const obsRoll = Math.random();
          if (obsRoll > 0.90) { 
              type=EntityType.HOLE; 
              // Make hole cover nearly the full width of the channel
              w = spawnWidth * CANVAS_WIDTH * 0.9; 
              h = 50; 
              col='#1A202C'; 
              relativeOffset = 0; // Center the hole
          }
          else if (obsRoll > 0.75) { 
              type=EntityType.WAVE; 
              w=spawnWidth * CANVAS_WIDTH * 1.1; // Full width to force jump
              h=20; col='#BEE3F8'; 
              relativeOffset = 0; // Center the wave
          } 
          else if (obsRoll > 0.55) { 
              type=EntityType.TRASH; 
              // Adapt to channel width (e.g., 50% of the track width)
              w = spawnWidth * CANVAS_WIDTH * 0.5; 
              h = 45; 
              col='#D69E2E'; 
          }
          else if (obsRoll > 0.35) { 
              type=EntityType.MARBLE; w=30; h=30; col='#FC8181';
              // Relative velocity
              vx = (Math.random()>0.5?1:-1) * (0.005 + Math.random()*0.005);
          }
          else {
              // INSECT - Predictive Enemy
              type = EntityType.INSECT; w=35; h=35; col='#68D391'; // Greenish
          }
      }

      entitiesRef.current.push({
        id: Date.now() + Math.random(),
        type,
        x: trackAtSpawn.centerX + (relativeOffset * trackAtSpawn.width), 
        y: -100,
        width: w,
        height: h,
        active: true,
        color: col,
        vx,
        offset: relativeOffset // Storing RELATIVE offset now
      });
    }
  };

  const updateEntities = () => {
    const speed = playerRef.current.speed * 15;
    const pDist = playerRef.current.distance;
    const playerScreenY = CANVAS_HEIGHT * 0.8;

    entitiesRef.current.forEach(e => {
      e.y += speed; 
      
      const eDist = pDist + (playerScreenY - e.y);
      const track = getTrackBounds(eDist);

      // Calculate normalized width of entity relative to screen width
      const normEntityW = e.width / CANVAS_WIDTH;
      // Calculate max relative offset to keep entity inside track walls
      // track.width is the normalized track width. 
      // We want: abs(offset * track.width) + normEntityW/2 < track.width/2
      // abs(offset) < 0.5 - (normEntityW / (2 * track.width))
      const maxOffset = 0.5 - (normEntityW / (2 * track.width));

      if (e.vx !== 0) {
          e.offset += e.vx;
          if (e.offset < -maxOffset) { e.offset = -maxOffset; e.vx *= -1; }
          if (e.offset > maxOffset) { e.offset = maxOffset; e.vx *= -1; }
      }

      // INSECT Logic: Predict player movement
      if (e.type === EntityType.INSECT) {
          const playerX = playerRef.current.x;
          // Insect X needs to be calculated to compare with player
          const insectX = track.centerX + (e.offset * track.width);
          
          // Move towards player
          const diff = playerX - insectX;
          const approachSpeed = 0.01; // Relative speed
          
          // We modify the relative offset
          // We need to convert the "diff" (which is in screen coords roughly) to relative offset change
          // But simple sign tracking is enough
          if (Math.abs(diff) > 0.01) {
              e.offset += Math.sign(diff) * approachSpeed;
          }
          
          // Clamp
          if (e.offset < -maxOffset) e.offset = -maxOffset;
          if (e.offset > maxOffset) e.offset = maxOffset;
      }

      // Recalculate X based on current track width and relative offset
      e.x = track.centerX + (e.offset * track.width);
    });

    // Check Enemy-Enemy Collisions
    for (let i = 0; i < entitiesRef.current.length; i++) {
        const e1 = entitiesRef.current[i];
        if (!e1.active || e1.type === EntityType.PAPER) continue; // Paper doesn't destroy enemies

        for (let j = i + 1; j < entitiesRef.current.length; j++) {
            const e2 = entitiesRef.current[j];
            if (!e2.active || e2.type === EntityType.PAPER) continue;

            // Simple AABB or distance check
            const e1x = e1.x * CANVAS_WIDTH;
            const e2x = e2.x * CANVAS_WIDTH;
            
            // If vertical distance is close (use centers)
            const e1cy = e1.y + e1.height / 2;
            const e2cy = e2.y + e2.height / 2;
            
            if (Math.abs(e1cy - e2cy) < (e1.height + e2.height) / 2) {
                // If horizontal distance is close
                if (Math.abs(e1x - e2x) < (e1.width + e2.width) / 2) {
                    // Destroy both
                    e1.active = false;
                    e2.active = false;
                    
                    // Spawn particles/explosion effect
                    for(let k=0; k<8; k++) {
                        particlesRef.current.push({
                            x: (e1x + e2x)/2 + (Math.random()-0.5)*20,
                            y: (e1cy + e2cy)/2 + (Math.random()-0.5)*20,
                            speed: 2 + Math.random() * 4,
                            length: 3 + Math.random() * 3,
                            opacity: 1
                        });
                    }
                }
            }
        }
    }

    entitiesRef.current = entitiesRef.current.filter(e => e.y < CANVAS_HEIGHT + 100 && e.active);

    if (playerRef.current.speed > 0.1 || BASE_SPEED > 0) {
       spawnEntity();
    }
  };

  const checkCollisions = () => {
    const p = playerRef.current;
    if (p.invulnerable > 0 || p.status !== 'NORMAL') return;

    const pw = 40; // width of boat
    const ph = 65; // height of boat
    const px = p.x * CANVAS_WIDTH - pw / 2; // left edge
    const py = CANVAS_HEIGHT * 0.8 + p.knockbackY - ph / 2; // top edge

    entitiesRef.current.forEach(e => {
        if (!e.active) return;
        
        const ex = e.x * CANVAS_WIDTH - (e.width/2); 
        const ey = e.y;
        
        if (
            px < ex + e.width &&
            px + pw > ex &&
            py < ey + e.height &&
            py + ph > ey
        ) {
            // Collision
            if (e.type === EntityType.PAPER) {
                p.durability = Math.min(100, p.durability + PAPER_HEAL);
                floatingTextsRef.current.push({ id: Date.now(), x: px + pw/2, y: py - 20, text: '+HP', color: '#48BB78', life: 40, maxLife: 40 });
                e.active = false;
            } else if (p.isJumping) {
                // Dodged everything while jumping
            } else if (e.type === EntityType.WAVE) {
                // Wave hits the boat
                p.knockbackY = 100; // Push back visually
                p.speed *= 0.2; // Drastically reduce speed
                p.durability -= 5; // Small damage
                p.invulnerable = 30; // Short invulnerability
                screenShakeRef.current = 15;
                floatingTextsRef.current.push({ id: Date.now(), x: px + pw/2, y: py - 20, text: '¡GOLPE!', color: '#E53E3E', life: 40, maxLife: 40 });
                e.active = false;
            } else if (e.type === EntityType.HOLE) {
                 p.status = 'FALLING';
                 p.fallTimer = 60;
                 e.active = false; 
            } else {
                let damage = 10;
                if (e.type === EntityType.MARBLE) damage = 15;
                if (e.type === EntityType.ROCK) damage = 20;
                if (e.type === EntityType.INSECT) damage = 25; // High damage
                
                p.durability -= damage;
                p.speed *= 0.5;
                p.invulnerable = 60;
                screenShakeRef.current = 10;
                floatingTextsRef.current.push({ id: Date.now(), x: px + pw/2, y: py - 20, text: `-${damage}`, color: '#E53E3E', life: 40, maxLife: 40 });
                e.active = false;
            }
        }
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.fillStyle = '#1a202c'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    
    // Screen Shake
    if (screenShakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * 10;
        const dy = (Math.random() - 0.5) * 10;
        ctx.translate(dx, dy);
        screenShakeRef.current--;
    }

    // --- Draw Dynamic Track ---
    const leftBank: {x: number, y: number, hasWalls: boolean, isExit: boolean}[] = [];
    const rightBank: {x: number, y: number, hasWalls: boolean, isExit: boolean}[] = [];
    
    const resolution = 20; 
    const lookAhead = 100; 
    const playerScreenY = CANVAS_HEIGHT * 0.8;

    let exitY = -1; // Y position where the exit starts being drawn

    for(let y = -lookAhead; y <= CANVAS_HEIGHT; y += resolution) {
        const distOffset = (playerScreenY - y);
        const d = playerRef.current.distance + distOffset;
        
        const bounds = getTrackBounds(d);
        leftBank.push({ x: bounds.left * CANVAS_WIDTH, y, hasWalls: bounds.hasWalls, isExit: bounds.isExit });
        rightBank.push({ x: bounds.right * CANVAS_WIDTH, y, hasWalls: bounds.hasWalls, isExit: bounds.isExit });
        
        if (bounds.isExit && exitY === -1) {
            exitY = y; 
        }
    }

    // --- DRAW LIQUID (WATER) or EXIT FLOOR ---
    const rc = rough.canvas(ctx.canvas);
    
    // Create gradient for exit transition
    // Since we are drawing one big polygon, we can use a linear gradient from top to bottom relative to where the exit starts
    if (exitY !== -1 && exitY < CANVAS_HEIGHT) {
        // Simple approach: Fill blue first, then fill grey on top for the exit part?
        // Better: fill everything blue, then overlay the exit.
        if (leftBank.length > 0) {
            rc.polygon([
                ...leftBank.map(p => [p.x, p.y] as [number, number]),
                ...rightBank.slice().reverse().map(p => [p.x, p.y] as [number, number])
            ], {
                fill: '#2B6CB0',
                fillStyle: 'solid',
                stroke: 'none',
                roughness: 1
            });
        }
        
        // Draw exit floor overlay
        // find index where exit starts
        const exitIndex = leftBank.findIndex(p => p.isExit);
        if(exitIndex !== -1) {
             // Polygon for exit
             rc.polygon([
                 ...leftBank.slice(0, exitIndex + 1).map(p => [p.x, p.y] as [number, number]),
                 ...rightBank.slice(0, exitIndex + 1).reverse().map(p => [p.x, p.y] as [number, number])
             ], {
                 fill: '#718096', // Concrete grey
                 fillStyle: 'solid',
                 stroke: 'none',
                 roughness: 1
             });
             
             // Draw "Light" at the end
             rc.polygon([
                 ...leftBank.slice(0, exitIndex + 1).map(p => [p.x, p.y] as [number, number]),
                 ...rightBank.slice(0, exitIndex + 1).reverse().map(p => [p.x, p.y] as [number, number])
             ], {
                 fill: 'rgba(255, 255, 200, 0.2)',
                 fillStyle: 'solid',
                 stroke: 'none',
                 roughness: 1
             });
        }

    } else {
        // All Water
        if (leftBank.length > 0) {
            rc.polygon([
                ...leftBank.map(p => [p.x, p.y] as [number, number]),
                ...rightBank.slice().reverse().map(p => [p.x, p.y] as [number, number])
            ], {
                fill: '#2B6CB0',
                fillStyle: 'solid',
                stroke: 'none',
                roughness: 1
            });
        }
    }
    
    // --- DRAW ANIMATED WATER LINES (Only on water parts) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.clip(); 
    
    const offset = (Date.now() / 20) % 40;
    for(let y = -40; y < CANVAS_HEIGHT; y+=40) {
        const drawY = y + offset;
        const distOffset = (playerScreenY - drawY);
        const d = playerRef.current.distance + distOffset;
        
        if (d > GOAL_DISTANCE) continue; // Don't draw water lines on exit

        const b = getTrackBounds(d);
        rc.line(b.left * CANVAS_WIDTH + 10, drawY, b.right * CANVAS_WIDTH - 10, drawY, {
            stroke: '#4299E1',
            strokeWidth: 2,
            roughness: 1.5
        });
    }
    ctx.restore();

    // --- DRAW BANKS / WALLS ---
    rc.polygon([
        [0, -lookAhead],
        ...leftBank.map(p => [p.x, p.y] as [number, number]),
        [0, CANVAS_HEIGHT]
    ], {
        fill: '#4A5568',
        fillStyle: 'solid',
        stroke: 'none',
        roughness: 1
    });
    
    rc.polygon([
        [CANVAS_WIDTH, -lookAhead],
        ...rightBank.map(p => [p.x, p.y] as [number, number]),
        [CANVAS_WIDTH, CANVAS_HEIGHT]
    ], {
        fill: '#4A5568',
        fillStyle: 'solid',
        stroke: 'none',
        roughness: 1
    });

    // --- DRAW KERBS / HAZARDS ---
    // We iterate segments to change color
    ctx.lineWidth = 5;
    
    // Left Kerb
    for(let i=0; i<leftBank.length-1; i++) {
        let strokeColor = leftBank[i].hasWalls ? '#CBD5E0' : '#E53E3E';
        if (leftBank[i].isExit) strokeColor = '#FFF';
        
        rc.line(leftBank[i].x, leftBank[i].y, leftBank[i+1].x, leftBank[i+1].y, {
            stroke: strokeColor,
            strokeWidth: 5,
            roughness: 1.5
        });
        
        // Add Danger stripes if no wall
        if (!leftBank[i].hasWalls && i % 2 === 0) {
             rc.rectangle(leftBank[i].x - 10, leftBank[i].y, 10, 10, {
                 fill: '#E53E3E',
                 fillStyle: 'solid',
                 stroke: 'none'
             });
        }
    }
    
    // Right Kerb
    for(let i=0; i<rightBank.length-1; i++) {
        let strokeColor = rightBank[i].hasWalls ? '#CBD5E0' : '#E53E3E';
        if (rightBank[i].isExit) strokeColor = '#FFF';
        
        rc.line(rightBank[i].x, rightBank[i].y, rightBank[i+1].x, rightBank[i+1].y, {
            stroke: strokeColor,
            strokeWidth: 5,
            roughness: 1.5
        });

        if (!rightBank[i].hasWalls && i % 2 === 0) {
             rc.rectangle(rightBank[i].x, rightBank[i].y, 10, 10, {
                 fill: '#E53E3E',
                 fillStyle: 'solid',
                 stroke: 'none'
             });
        }
    }

    // --- Entities ---
    entitiesRef.current.forEach(e => {
        if(!e.active) return;
        const ex = (e.x * CANVAS_WIDTH) - (e.width/2);
        
        if (e.type === EntityType.ROCK) {
            rc.rectangle(ex, e.y, e.width, e.height, {
                fill: e.color,
                fillStyle: 'solid',
                roughness: 2,
                stroke: '#4A5568'
            });
        } else if (e.type === EntityType.MARBLE) {
            rc.circle(ex + e.width/2, e.y + e.height/2, e.width, {
                fill: e.color,
                fillStyle: 'solid',
                roughness: 1.5,
                stroke: '#2D3748'
            });
            rc.circle(ex + e.width/2 - 5, e.y + e.height/2 - 5, 10, {
                fill: 'white',
                fillStyle: 'solid',
                stroke: 'none'
            });
        } else if (e.type === EntityType.HOLE) {
             rc.ellipse(ex + e.width/2, e.y + e.height/2, e.width, e.height, {
                 fill: '#1A202C',
                 fillStyle: 'solid',
                 stroke: '#4A5568',
                 strokeWidth: 2,
                 roughness: 2
             });
             // Add a swirl to make it look like a whirlpool
             rc.ellipse(ex + e.width/2, e.y + e.height/2, e.width*0.6, e.height*0.6, {
                 stroke: '#718096',
                 strokeWidth: 2,
                 roughness: 2
             });
        } else if (e.type === EntityType.PAPER) {
             rc.polygon([
                 [ex + e.width/2, e.y],
                 [ex + e.width, e.y + e.height/2],
                 [ex + e.width/2, e.y + e.height],
                 [ex, e.y + e.height/2]
             ], {
                 fill: '#FFF',
                 fillStyle: 'solid',
                 stroke: '#CBD5E0',
                 roughness: 1
             });
        } else if (e.type === EntityType.WAVE) {
             rc.rectangle(ex, e.y, e.width, e.height, {
                 fill: '#90CDF4',
                 fillStyle: 'solid',
                 stroke: '#3182CE',
                 strokeWidth: 2,
                 roughness: 2
             });
             rc.line(ex, e.y + e.height/2, ex + e.width, e.y + e.height/2, {
                 stroke: '#EBF8FF',
                 strokeWidth: 2,
                 roughness: 3
             });
        } else if (e.type === EntityType.INSECT) {
             rc.polygon([
                 [ex + e.width/2, e.y],
                 [ex + e.width, e.y + e.height],
                 [ex, e.y + e.height]
             ], {
                 fill: '#48BB78',
                 fillStyle: 'solid',
                 stroke: '#276749',
                 roughness: 1.5
             });
             
             // Eyes
             rc.circle(ex + e.width/2 - 5, e.y + e.height/2, 6, { fill: '#C53030', fillStyle: 'solid', stroke: 'none' });
             rc.circle(ex + e.width/2 + 5, e.y + e.height/2, 6, { fill: '#C53030', fillStyle: 'solid', stroke: 'none' });
        } else {
             rc.rectangle(ex, e.y, e.width, e.height, { 
                 fill: e.color, 
                 fillStyle: 'solid',
                 stroke: '#975A16',
                 strokeWidth: 2,
                 roughness: 2
             });
        }
    });

    // --- Draw Warning Indicator for Waves ---
    let waveWarning = false;
    entitiesRef.current.forEach(e => {
        if (e.active && e.type === EntityType.WAVE && e.y > -200 && e.y < CANVAS_HEIGHT * 0.4) {
            waveWarning = true;
        }
    });

    if (waveWarning && gameState === GameState.PLAYING) {
        ctx.save();
        ctx.fillStyle = 'rgba(229, 62, 62, 0.8)'; // Red warning
        ctx.font = 'bold 32px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        // Flashing effect
        if (Math.floor(Date.now() / 200) % 2 === 0) {
            ctx.fillText('⚠️ ¡OLA ACERCÁNDOSE! ¡SALTA! ⚠️', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.3);
        }
        ctx.restore();
    }

    // --- Player ---
    const p = playerRef.current;
    
    if ((gameState !== GameState.GAME_OVER && gameState !== GameState.VICTORY) || Math.floor(Date.now() / 200) % 2 === 0) {
        if (p.invulnerable === 0 || Math.floor(Date.now() / 50) % 2 === 0) {
            const px = p.x * CANVAS_WIDTH;
            const py = CANVAS_HEIGHT * 0.8 + p.knockbackY;
            
            // Draw Wake Particles
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            wakeParticlesRef.current.forEach(wp => {
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, wp.size * (wp.life / wp.maxLife), 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw Shadow
            if (p.status !== 'FALLING') {
                ctx.save();
                ctx.translate(px, py + 20);
                const shadowScale = 1 - (p.jumpHeight * 0.3);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(0, 0, 25 * shadowScale, 10 * shadowScale, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.save();
            ctx.translate(px, py);
            
            if (p.status === 'FALLING') {
                const scale = p.fallTimer / 60;
                ctx.scale(scale, scale);
                ctx.rotate(p.fallTimer * 0.2);
            } else {
                let rotation = 0;
                if (keysPressed.current['KeyA']) rotation = -0.2;
                if (keysPressed.current['KeyD']) rotation = 0.2;
                ctx.rotate(rotation);
                const scale = 1 + (p.jumpHeight * 0.4);
                ctx.scale(scale, scale);
            }

            // Boat
            // We need to temporarily disable shadow for roughjs to look right
            ctx.shadowColor = 'transparent';
            
            rc.polygon([
                [0, -35],
                [20, 30],
                [0, 20],
                [-20, 30]
            ], {
                fill: '#FFF',
                fillStyle: 'solid',
                stroke: '#CBD5E0',
                strokeWidth: 2,
                roughness: 1.5,
                bowing: 1
            });
            
            rc.line(0, -35, 0, 20, {
                stroke: '#CBD5E0',
                strokeWidth: 2,
                roughness: 1.5
            });

            ctx.restore();
        }
    }

    // --- Rain ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    particlesRef.current.forEach(pt => {
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - 2, pt.y + pt.length);
        ctx.stroke();
        pt.y += pt.speed;
        pt.x -= 0.5;
        if (pt.y > CANVAS_HEIGHT) {
            pt.y = -20;
            pt.x = Math.random() * CANVAS_WIDTH;
        }
    });

    // --- Floating Texts ---
    floatingTextsRef.current.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.life / ft.maxLife;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 20px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });

    ctx.restore(); // Restore screen shake

    // --- PAUSED OVERLAY REMOVED (Handled by UIOverlay) ---
  };

  return (
    <div 
        className="absolute inset-0 overflow-hidden shadow-2xl"
        style={{
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            border: 'solid 4px #374151'
        }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block bg-gray-900 w-full h-full object-fill"
        style={{ 
            imageRendering: 'pixelated',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px'
        }}
      />
    </div>
  );
};

export default GameCanvas;