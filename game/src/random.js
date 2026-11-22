// Copper Fox — seeded random numbers (mulberry32): the same seed always builds
// the same heist, so a staged screenshot and a replayed run agree frame for frame.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small integer in [min, max] from the seeded stream. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** Pick one element of `items` from the seeded stream. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
