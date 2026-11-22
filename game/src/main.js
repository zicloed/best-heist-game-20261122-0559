// Midnight Getaway — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between five screens:
// title, play, paused, win and caught.
//
// ?shot=cover|sneak|alarm|victory stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
// window.__heist exposes the live world for headless play-testing.
import { BEST_KEY, STEP } from './config.js';
import { createWorld, EVENT_CAUGHT, EVENT_COIN, EVENT_EMP, EVENT_PICKUP, EVENT_SPOTTED, EVENT_STARE, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_EMP, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
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
    renderer.draw(world.state, scene.screen, scene.best, world.state.elapsed);
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

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Steal the Starlight Diamond, then reach the getaway van.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_CAUGHT;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won
      ? `Clean getaway! Score ${world.state.score}.`
      : `Busted. ${world.state.catchReason} Score ${world.state.score}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_CAUGHT)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return actions;
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) return; // the title paints the live museum behind the panel
    const dir = input.direction();
    const coin = input.takeCoin();
    const coinTarget = coin === 'forward'
      ? null
      : coin;
    const events = world.step(STEP, {
      x: dir.x, y: dir.y, sneak: dir.sneak,
      coin: coin !== null,
      coinX: coinTarget ? coinTarget.x : undefined,
      coinY: coinTarget ? coinTarget.y : undefined,
      emp: !!(actions & ACTION_EMP),
    });
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_COIN) audio.coin();
    if (events & EVENT_EMP) audio.emp();
    if (events & EVENT_STARE) audio.stare();
    if (events & EVENT_SPOTTED) audio.spotted();
    if (events & EVENT_WIN) {
      audio.win();
      endGame(true);
    } else if (events & EVENT_CAUGHT) {
      audio.caught();
      endGame(false);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, world.state.elapsed);
  }

  // Leaving the tab pauses a running game rather than letting the alarm rise unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // Headless play-test hook: steer the thief and read the world.
  window.__heist = {
    world,
    start: startGame,
    screen: () => screen,
    setMove(x, y, sneak) {
      // Drive the world directly, bypassing the keyboard, one fixed step at a time.
      if (screen !== SCREEN_PLAY) return world.state;
      const events = world.step(STEP, { x, y, sneak: !!sneak, coin: false, emp: false });
      if (events & EVENT_WIN) endGame(true);
      else if (events & EVENT_CAUGHT) endGame(false);
      return world.state;
    },
    tossCoin(x, y) {
      if (screen !== SCREEN_PLAY) return;
      world.step(STEP, { x: 0, y: 0, sneak: false, coin: true, coinX: x, coinY: y, emp: false });
    },
    useEmp() {
      if (screen !== SCREEN_PLAY) return;
      world.step(STEP, { x: 0, y: 0, sneak: false, coin: false, emp: true });
    },
  };

  announce('Midnight Getaway. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
