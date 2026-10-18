# Connecting to the World · slides

A single-page slide deck for the Vefskólinn talk that opens Module 4. It frames
the module as connections in three directions:

- your app → the world (APIs, AI built into Chrome)
- your agent → the world (MCP, skills)
- the world's agents → your app (the accessibility tree, WebMCP)

It also sets up the four code guides that follow the design guides:

- 4.1 Accessible in use
- 4.2 Design system in code
- 4.3 APIs: make the redesign real
- 4.4 Motion and video

After those it covers the auto-graded 4.5 check, the rules for using AI so
students actually learn, and the changes to the group project.

The look is a vintage route map: cream paper, navy ink, and one route colour per
direction (blue, orange, green). Body text is Atkinson Hyperlegible, a typeface
designed for low-vision readers, which fits a module that opens with accessibility.

The plan behind the deck, with the LMS fields for every guide, is the Claude Docs
memo "Module 4 coding plan":
https://claude.ai/code/artifact/07c7be08-1661-47fb-97b0-6580034e217c

## Run it

Open `index.html` straight from disk, or serve the folder:

```sh
npx serve .
# or: python3 -m http.server 8000
```

## Presenting

| Key            | Action                                        |
| -------------- | --------------------------------------------- |
| → / space      | next step (fragments, then slide)             |
| ←              | previous                                      |
| Home / End     | first / last slide                            |
| N              | toggle speaker notes                          |
| F              | fullscreen                                    |
| 1 / 2 / 3      | on the three-directions slide, pick a route   |
| ?              | keyboard help                                 |

Slides are addressable by hash, e.g. `index.html#/9`.
Append `?static&all` to disable animations and reveal every fragment
(handy for printing or screenshots).

## Interactive bits

- Slide 3: click a route, or press 1, 2 or 3. The map highlights that direction
  and the panel explains it and names the guide.
- Slide 4: the same small page as good HTML and as div soup. **Run the agent**
  scans the accessibility tree for something that saves the article. It finds
  `button "Save"` in one version and nothing in the other.
- Slide 5: click a design card to light up the code guide it feeds.
- Slide 7: click a Figma property (variant, text, boolean, instance swap) to
  highlight where it lands in a Button component. Switch between React, Vue and
  Angular.
- Slide 8: two requests to an agent. The context bar shows when SKILL.md gets
  loaded (progressive disclosure).
- Slide 9: step through the six-step tool loop: you → model → your code →
  Wikipedia API → your code → model → you.
- Slide 11: the three films. Each plays with sound; starting one pauses the others,
  and leaving the slide pauses them all.
- Slide 12: a drawer to open, with a `prefers-reduced-motion` switch beside it.
  It starts checked if the OS already asks for reduced motion.
- Slide 14: click one of the six usage patterns from the Anthropic study to see
  what it sounds like as a prompt.
- Slide 18: **Ask this browser** calls `LanguageModel.availability()` and reports
  whether this laptop can run Chrome's built-in model. It downloads nothing.

## Before presenting

- Slide 17 gives no start date for the group project. The LMS seed says
  6 November; the semester plan shows group work from week 46. Settle it and
  say it out loud.
- Thoughtworks Technology Radar Vol. 35 is due around 28–29 October 2026.
  Skim it before the code half and adjust slide 10 if MCP or skills moved.
- Slide 18 quotes Chrome's built-in AI requirements as of October 2026
  (22 GB free disk; a GPU with more than 4 GB of VRAM, or 16 GB RAM and 4 cores).
  Recheck them at https://developer.chrome.com/docs/ai/get-started.
- Slide 13 quotes the claudeMovies `STYLE-LIBRARY.md`. Update it if the library
  gets new lessons.

## Files

- `index.html`: all 19 slides and the speaker notes (`data-notes`)
- `styles.css`: look and feel
- `app.js`: navigation, the background route animation, and the interactive bits
- `assets/island.mp4`, `player2.mp4`, `neopunk.mp4`: 720p copies of the three films
  (originals in `~/vefskolinn/sustainable-island-film/out/` and
  `~/Documents/claudeMovies/videos/*/renders/`)
- `assets/*.jpg`: poster frames for the films
