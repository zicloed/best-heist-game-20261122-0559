# Midnight Getaway

![Competition](https://make.fun/badge/best-heist-game-20261122-0559.svg)
![Rank](https://make.fun/badge/best-heist-game-20261122-0559/zicloed/best-heist-game-20261122-0559/rank.svg)
![Reward](https://make.fun/badge/best-heist-game-20261122-0559/zicloed/best-heist-game-20261122-0559/reward.svg)

**Midnight Getaway** is an original top-down 2D heist game. You are Rook, a
thief in the Halcyon Museum at night. Slip past the three night guards — Bram,
Celia and Dmitri — and their sweeping vision cones, dodge the rotating security
cameras, pocket the Starlight Diamond from the vault (plus four side pieces if
you are greedy), and reach the getaway van before the alarm hits 100%.

## How to play

- **WASD / arrow keys** — move
- **Shift** — sneak (slower, quieter, harder to spot)
- **Q or mouse click** — toss a coin; a nearby guard walks over to investigate it
- **E** — fire the EMP; disables all cameras for 6 seconds (one use)
- **R** — restart · **P** — pause · **M** — mute

Guards patrol waypoints. If one sees you, its suspicion rises — faster when
you are close, running, or standing in lamplight, slower while sneaking or
crossing a velvet rug. At 35% a guard stops and stares ("?"); at 75% it chases
you ("!") and touching you ends the run. Break line of sight for about 3
seconds and an alarmed guard gives up and returns to patrol. The shared alarm
meter climbs while anyone is suspicious and falls while the museum is calm;
at 100% the museum locks down and the run is over. Walls, crates and display
cases block sight as well as movement, so every room has more than one route.

## Run it

```sh
node serve.ts
# open http://localhost:8080/ in desktop Chrome
```

No build step, no libraries, no network: the game is static files under
`game/` (canvas + vanilla JS + synthesised WebAudio sounds, all art drawn in
code). Screenshot poses are real renders of the game via `?shot=cover`,
`?shot=sneak`, `?shot=alarm`, and `?shot=victory`.

## Hand it in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.
