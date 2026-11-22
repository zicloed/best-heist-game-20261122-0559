// Midnight Getaway — keyboard and mouse, turned into a direction plus one-shot
// actions. Actions are consumed with takeActions(), so a press fires once.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_EMP = 16;

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false, sneak: false };
  let actions = 0;
  let coinTarget = null;

  function onKeyDown(event) {
    const dir = KEYMAP[event.code];
    if (dir) {
      held[dir] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      actions |= ACTION_RESTART;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    } else if (event.code === 'KeyE') {
      actions |= ACTION_EMP;
    } else if (event.code === 'KeyQ') {
      coinTarget = 'forward';
    }
  }

  function onKeyUp(event) {
    const dir = KEYMAP[event.code];
    if (dir) held[dir] = false;
  }

  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    coinTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('click', onClick);

  function direction() {
    const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    return { x, y, sneak: held.sneak };
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  /** A coin toss request since the last call, or null. 'forward' = toss ahead of the thief. */
  function takeCoin() {
    const target = coinTarget;
    coinTarget = null;
    return target;
  }

  return { direction, takeActions, takeCoin };
}
