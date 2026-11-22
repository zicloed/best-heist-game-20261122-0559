// Copper Fox — keyboard and mouse, turned into a direction plus one-shot
// actions. Actions are consumed with takeActions(), so a press fires once.
// Clicking the floor sets a move target; clicking a screen button confirms.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_SMOKE = 8;
export const ACTION_EMP = 16;
export const ACTION_RESTART = 32;
export const ACTION_MUTE = 64;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyE: ACTION_INTERACT,
  KeyQ: ACTION_SMOKE,
  KeyF: ACTION_EMP,
  KeyR: ACTION_RESTART,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;
  let clickConsumed = true;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) {
      actions |= action;
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    click = { x, y };
    clickConsumed = false;
    actions |= ACTION_CONFIRM;
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);

  /** The held movement direction this frame, normalised. */
  function direction() {
    let dx = 0;
    let dy = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
    return { dx, dy, sneak: keys.has('ShiftLeft') || keys.has('ShiftRight') };
  }

  /** Take and clear the actions pressed since the last call. */
  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  /** Take the latest floor click, if one arrived since the last call. */
  function takeClick() {
    if (clickConsumed || !click) return null;
    clickConsumed = true;
    return click;
  }

  return { direction, takeActions, takeClick };
}
