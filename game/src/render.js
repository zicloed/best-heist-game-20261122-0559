// Copper Fox — everything drawn: the room floor, the rugs and walls, the loot,
// the vision cones, the guards and cameras, the thief, the HUD and the screens.
// It only reads state; it never changes a rule.
import { CAMERA, FIELD, GUARD, HUD_HEIGHT, THIEF } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEARED = 'cleared';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_COMPLETE = 'complete';

const FLOOR_A = '#141a2b';
const FLOOR_B = '#171e33';
const WALL = '#2c3550';
const WALL_TOP = '#4a5878';
const RUG = '#4a2230';
const CONE_GUARD = 'rgba(255, 190, 60, 0.20)';
const CONE_ALERT = 'rgba(255, 64, 64, 0.30)';
const CONE_CAMERA = 'rgba(96, 180, 255, 0.16)';
const GOLD = '#f5c542';

function cone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor(state) {
    ctx.fillStyle = FLOOR_A;
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
    // Checkerboard marble tiles.
    const tile = 64;
    for (let y = HUD_HEIGHT; y < FIELD.height; y += tile) {
      for (let x = 0; x < FIELD.width; x += tile) {
        if (((x / tile) + (y / tile)) % 2 === 0) {
          ctx.fillStyle = FLOOR_B;
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }
    // Rugs: deep red, gold border.
    for (const rug of state.def.rugs) {
      ctx.fillStyle = RUG;
      ctx.fillRect(rug.x, rug.y, rug.w, rug.h);
      ctx.strokeStyle = 'rgba(245, 197, 66, 0.45)';
      ctx.lineWidth = 3;
      ctx.strokeRect(rug.x + 6, rug.y + 6, rug.w - 12, rug.h - 12);
    }
  }

  function drawWalls(state) {
    for (const wall of state.walls) {
      ctx.fillStyle = WALL;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = WALL_TOP;
      ctx.fillRect(wall.x, wall.y, wall.w, 4);
    }
    // Display cases: glass-topped blocks the thief can hide behind.
    for (const block of state.def.walls.filter((w) => w.w === 70)) {
      ctx.fillStyle = 'rgba(140, 190, 230, 0.25)';
      ctx.fillRect(block.x + 4, block.y + 4, block.w - 8, block.h - 8);
    }
  }

  function drawExit(state) {
    const exit = state.def.exit;
    const glow = 0.5 + 0.3 * Math.sin(state.time * 3);
    ctx.fillStyle = `rgba(46, 204, 113, ${0.75 + glow * 0.2})`;
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = '#0d3b1e';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2);
  }

  function drawLoot(state) {
    const loot = state.def.loot;
    if (state.lootTaken) {
      ctx.fillStyle = '#3a4360';
      ctx.fillRect(loot.x - 22, loot.y - 10, 44, 20);
      return;
    }
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);
    const glow = ctx.createRadialGradient(loot.x, loot.y, 4, loot.x, loot.y, 60);
    glow.addColorStop(0, `rgba(245, 197, 66, ${0.55 * pulse})`);
    glow.addColorStop(1, 'rgba(245, 197, 66, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 60, 0, Math.PI * 2);
    ctx.fill();
    // Pedestal, then the prize itself: a cut gem.
    ctx.fillStyle = '#2c3550';
    ctx.fillRect(loot.x - 22, loot.y - 8, 44, 18);
    ctx.save();
    ctx.translate(loot.x, loot.y - 14);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = GOLD;
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2;
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.restore();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(loot.name.toUpperCase(), loot.x, loot.y + 34);
  }

  function drawSmoke(state) {
    for (const smoke of state.smokes) {
      if (state.time >= smoke.until) continue;
      const left = smoke.until - state.time;
      const alpha = Math.min(0.55, left * 0.2);
      const gradient = ctx.createRadialGradient(smoke.x, smoke.y, 10, smoke.x, smoke.y, 95);
      gradient.addColorStop(0, `rgba(200, 205, 215, ${alpha})`);
      gradient.addColorStop(1, 'rgba(200, 205, 215, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(smoke.x, smoke.y, 95, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      cone(ctx, guard.x, guard.y, guard.facing, GUARD.range, GUARD.halfAngle,
        guard.spotting > 0 ? CONE_ALERT : CONE_GUARD);
    }
    for (const guard of state.guards) {
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fillStyle = guard.chasing ? '#8a2f2f' : '#3a4a6b';
      ctx.fill();
      ctx.strokeStyle = '#dfe6f5';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing tick, like a torch beam's source.
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.facing) * 22, guard.y + Math.sin(guard.facing) * 22);
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (guard.chasing) {
        ctx.fillStyle = '#ff5a5a';
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', guard.x, guard.y - 26);
      } else if (guard.suspicion > 0.35) {
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', guard.x, guard.y - 26);
      }
    }
  }

  function drawCameras(state) {
    for (const camera of state.cameras) {
      const disabled = state.time < camera.disabledUntil;
      if (!disabled) cone(ctx, camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.halfAngle,
        camera.spotting > 0 ? CONE_ALERT : CONE_CAMERA);
    }
    for (const camera of state.cameras) {
      const disabled = state.time < camera.disabledUntil;
      ctx.beginPath();
      ctx.arc(camera.x, camera.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = disabled ? '#555f75' : '#22304a';
      ctx.fill();
      ctx.strokeStyle = disabled ? '#888' : (camera.spotting > 0 ? '#ff5a5a' : '#7fd4ff');
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(camera.x, camera.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = disabled ? '#888' : '#ff5a5a';
      ctx.fill();
    }
  }

  function drawThief(state) {
    const thief = state.thief;
    // A clicked destination shows as a small marker on the floor.
    if (thief.moveTarget) {
      ctx.beginPath();
      ctx.arc(thief.moveTarget.x, thief.moveTarget.y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(224, 138, 60, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (thief.sneaking) {
      ctx.beginPath();
      ctx.arc(thief.x, thief.y, THIEF.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(224, 138, 60, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Hooded fox: copper cloak, dark hood, one pale ear.
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, THIEF.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e08a3c';
    ctx.fill();
    ctx.strokeStyle = '#2b1a0c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#2b1a0c';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(thief.x, thief.y);
    ctx.lineTo(thief.x + Math.cos(thief.facing) * 20, thief.y + Math.sin(thief.facing) * 20);
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawHud(state, screen, best) {
    ctx.fillStyle = '#0b0f1c';
    ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
    ctx.fillStyle = '#2c3550';
    ctx.fillRect(0, HUD_HEIGHT - 2, FIELD.width, 2);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eef1f5';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(state.def.name, 18, 22);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#9aa7c7';
    ctx.fillText(`${state.def.room}   ·   ${formatTime(state.time)}   ·   Score ${state.score}   ·   Best ${best}`, 18, 46);

    // Alarm meter: the bar the whole game is about.
    const meterX = 760;
    const meterW = 300;
    ctx.fillStyle = '#9aa7c7';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const alarmLabel = state.alarm > 70 && Math.sin(state.time * 10) > 0 ? '#ff4d4d' : '#9aa7c7';
    ctx.fillStyle = alarmLabel;
    ctx.fillText(`ALARM  ${Math.round(state.alarm)}%`, meterX, 22);
    ctx.fillStyle = '#1c2438';
    ctx.fillRect(meterX, 34, meterW, 16);
    const ratio = state.alarm / 100;
    const alarmColor = state.alarm > 70 ? '#ff4d4d' : state.alarm > 35 ? '#ffb13d' : '#3ddc84';
    ctx.fillStyle = alarmColor;
    ctx.fillRect(meterX, 34, meterW * ratio, 16);
    ctx.strokeStyle = '#4a5878';
    ctx.lineWidth = 1;
    ctx.strokeRect(meterX, 34, meterW, 16);

    ctx.textAlign = 'right';
    ctx.fillStyle = state.lootTaken ? GOLD : '#9aa7c7';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(state.lootTaken ? `◆ ${state.def.loot.name} secured` : `◆ ${state.def.loot.name} — grab it (E)`, FIELD.width - 18, 22);
    ctx.fillStyle = '#9aa7c7';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`Q smoke ×${state.tools.smoke} (−${150})    F EMP ×${state.tools.emp} (−${200})`, FIELD.width - 18, 46);
    ctx.textAlign = 'left';
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(6, 9, 18, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#141a2b';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    const boxW = 640;
    const boxH = 120 + lines.length * 34;
    const boxX = (FIELD.width - boxW) / 2;
    const boxY = (FIELD.height - boxH) / 2;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(title, FIELD.width / 2, boxY + 62);
    ctx.fillStyle = '#eef1f5';
    ctx.font = '18px system-ui, sans-serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, FIELD.width / 2, boxY + 116 + index * 34);
    });
  }

  function draw(screen, state, best) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawFloor(state);
    drawExit(state);
    drawLoot(state);
    drawSmoke(state);
    drawGuards(state);
    drawCameras(state);
    drawThief(state);
    drawHud(state, screen, best);

    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(6, 9, 18, 0.82)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 84px system-ui, sans-serif';
      ctx.fillText('COPPER FOX', FIELD.width / 2, 250);
      ctx.fillStyle = '#eef1f5';
      ctx.font = '28px system-ui, sans-serif';
      ctx.fillText('The Midnight Heist', FIELD.width / 2, 300);
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillStyle = '#c7d0e4';
      const lines = [
        'Three rooms. Three prizes. One fox in the dark.',
        '',
        'WASD / arrows — move      Shift — sneak (slower, harder to spot)',
        'Click the floor — walk there      E — grab the loot      Q — smoke pellet      F — EMP burst',
        'Tools cost score. Guards chase what they see. Cameras never blink.',
        'Grab the loot, reach the green EXIT, and vanish before the alarm hits 100%.',
        '',
        'Press Enter or click to begin.',
      ];
      lines.forEach((line, index) => {
        ctx.fillText(line, FIELD.width / 2, 360 + index * 30);
      });
      if (best > 0) {
        ctx.fillStyle = GOLD;
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 360 + lines.length * 30 + 10);
      }
    } else if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['Press P or Enter to keep stealing.'], '#9aa7c7');
    } else if (screen === SCREEN_CLEARED) {
      const last = state.index + 1 >= 3;
      panel(last ? 'ALL THREE HEISTS DONE' : 'HEIST COMPLETE', [
        `${state.def.loot.name} — secured.`,
        `Time ${formatTime(state.time)}   ·   time bonus +${state.timeBonus || 0}   ·   ghost bonus +${state.stealthBonus || 0}`,
        `Score ${state.score}`,
        last ? 'Press Enter to see the getaway.' : 'Press Enter for the next heist.',
      ], GOLD);
    } else if (screen === SCREEN_BUSTED) {
      panel('BUSTED!', [
        state.bustReason,
        `Score ${state.score}   ·   Best ${best}`,
        'Press Enter to try this heist again.',
      ], '#ff4d4d');
    } else if (screen === SCREEN_COMPLETE) {
      panel('THE FOX VANISHES', [
        'Three rooms, three prizes, no alarms left ringing.',
        `Final score ${state.score}   ·   Best ${best}`,
        'Press Enter to run the heists again.',
      ], GOLD);
    }
  }

  return { draw };
}
