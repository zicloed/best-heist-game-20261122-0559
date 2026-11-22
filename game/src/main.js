// Copper Fox — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between six screens:
// title, play, paused, level cleared, busted and the final getaway.
//
// ?seed=N fixes the patrol jitter. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_CLEAR, EVENT_LOOT, EVENT_SPOTTED, EVENT_TOOL } from './world.js';
import { ACTION_CONFIRM, ACTION_EMP, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, ACTION_SMOKE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_CLEARED, SCREEN_COMPLETE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(scene.screen, world.state, readBest());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastStepSound = 0;
  let spottedSoundAt = 0;

  // Screen readers (and anyone watching the page's text) hear the changes.
  function announce(message) {
    status.textContent = message;
  }

  function startHeist(levelIndex) {
    world.reset(levelIndex);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing ${world.state.def.name}. Grab the ${world.state.def.loot.name} and reach the exit.`);
  }

  function finishLevel() {
    const lastLevel = world.levelIndex + 1 >= world.levelCount;
    screen = lastLevel ? SCREEN_COMPLETE : SCREEN_CLEARED;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(lastLevel
      ? `All three heists done. Final score ${world.state.score}.`
      : `Heist complete. Score ${world.state.score}.`);
  }

  function endRun() {
    screen = SCREEN_BUSTED;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Busted. ${world.state.bustReason}`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) {
      audio.click();
      startHeist(0);
    } else if (screen === SCREEN_CLEARED && (actions & ACTION_CONFIRM)) {
      audio.click();
      startHeist(world.levelIndex + 1);
    } else if (screen === SCREEN_COMPLETE && (actions & ACTION_CONFIRM)) {
      audio.click();
      world.startOver();
      startHeist(0);
    } else if (screen === SCREEN_BUSTED && (actions & ACTION_CONFIRM)) {
      audio.click();
      startHeist(world.levelIndex);
    } else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen === SCREEN_PLAY && (actions & ACTION_RESTART)) {
      startHeist(world.levelIndex);
      announce('Heist restarted.');
    }
    return actions;
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, sneak: false, interact: false, smoke: false, emp: false, target: null });
      return;
    }
    const direction = input.direction();
    const click = input.takeClick();
    const controls = {
      dx: direction.dx,
      dy: direction.dy,
      sneak: direction.sneak,
      interact: Boolean(actions & ACTION_INTERACT),
      smoke: Boolean(actions & ACTION_SMOKE),
      emp: Boolean(actions & ACTION_EMP),
      target: click,
    };
    if (click) audio.unlock();
    const events = world.step(STEP, controls);
    const state = world.state;
    if (state.thief.moving && state.time - lastStepSound > 0.34) {
      lastStepSound = state.time;
      audio.step();
    }
    if (events & EVENT_LOOT) {
      audio.grab();
      announce(`${state.def.loot.name} secured. Reach the exit.`);
    }
    if (events & EVENT_TOOL) audio.tool();
    if ((events & EVENT_SPOTTED) && state.time - spottedSoundAt > 2.5) {
      spottedSoundAt = state.time;
      audio.spotted();
    }
    if (events & EVENT_CLEAR) {
      audio.clear();
      finishLevel();
    } else if (events & EVENT_BUSTED) {
      audio.busted();
      endRun();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      // One-shot actions (grab, smoke, EMP) fire on the first step only, so a
      // slow frame does not spend a tool twice.
      let firstStep = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(screen, world.state, best);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Copper Fox: The Midnight Heist. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
