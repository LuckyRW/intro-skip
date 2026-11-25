# Intro Skip

An oss!idle add-on that skips a map's intro for you, as pressing SKIP does: the
server moves the play earlier, so it ends and the next map starts that much sooner.

- On the play screen it presses Space, as before. Anywhere else in the game
  (song select, menus, minimised) it sends the play screen's skip itself over the
  game's connection, so the game only has to be open, not on the play screen.
  A play the server runs while the game is closed keeps its intro.
- The connection is found the first time the game sends on it, and a play is
  known when it starts: a play already running when the add-on loads keeps its intro.
- Only the intro before the first note can be skipped, not breaks within a map.
- It presses Space, the game's skip key, which reaches the game like your own press.
  Turn the add-on off in the add-ons list to stop it.
