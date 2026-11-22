# Copper Fox — The Midnight Heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/zicloed/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/zicloed/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Copper Fox — The Midnight Heist** is an original top-down 2D stealth heist game. You are the Copper Fox, a thief working three rooms in one night: the Meridian Gallery, the Meridian Vault and the Penthouse Suite. Slip past patrolling guards and their sweeping vision cones, dodge the rotating security cameras, pocket the prize — the Jade Fox, the Solar Diamond, the Crown of Meridia — and reach the green EXIT before the alarm meter hits 100%.

## How to play

- **WASD / arrow keys** — move (or click the floor to walk there)
- **Shift** — sneak: slower, but half as easy to spot
- **E** — grab the loot when close to it
- **Q** — smoke pellet: hides you for 5 seconds, costs 150 score
- **F** — EMP burst: disables every camera for 6 seconds, costs 200 score
- **P** — pause · **R** — restart the heist · **M** — mute

Guards patrol waypoints. If one sees you, its suspicion rises — faster when you are close or running, slower while sneaking or hidden in smoke; at 65% it chases you, and touching you ends the run. Cameras sweep their cones and feed the shared alarm meter, which climbs while anyone can see you and falls while the room is calm; at 100% the building locks down and the run is over. Walls and display cases block sight as well as movement, so every room has more than one route. Grabbing the loot adds its value; clearing a room adds a time bonus and a ghost bonus for keeping the alarm low.

## Run it

Serve `game/` with any static server and open `game/index.html` in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080/
```

No build step, no network request, no third-party code: the game is plain static files, its sounds are synthesised with WebAudio, and its patrol jitter is deterministic from `?seed=N`. Screenshot scenes are staged with `?shot=start|play|mid|end&seed=1` (`mid` stops 10 seconds into the first heist; `play` runs on to the loot approach).

## Hand it in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
