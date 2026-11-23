# Twig's Tinker School of House Keeping

An 11-week, self-paced workshop on cleaning and home upkeep from zero. It's written for ADHD, autistic and AuDHD brains, and for people wired for pathological demand avoidance (PDA): every task comes with its reason, there are no "shoulds," every task has a "Done looks like" finish line, and each one comes in three sizes (Crumb, Standard, Great Scott). The weeks can go in any order, and the daily, weekly and monthly checklists reset themselves, with no streaks or scores.

Your host is Twig, a sassy tinker gnome who explains the house as a machine.

It runs straight from these files in Chrome, Edge or Firefox. There's no server, no install and no account, and nothing leaves your computer. Only the outside links (marked ↗) need the internet.

## Start

1. Unzip the folder anywhere you like.
2. Double-click `index.html`, then click the workshop card. You can also open `courses/house/index.html` directly and bookmark it.

**For people new to GitHub, click on release to the right and download the source code zip file, then unzip that**

Keyboard: ← and → move between pages. The goggles button switches between three color themes (workshop, parchment and slate). On a phone the page tidies itself up: compact top bar, the weeks in a drop-down, and tables you can scroll sideways. Ctrl+P prints the current page without the sidebar.

## Your progress

Everything you tick, mark complete, score or type is saved in your browser on this computer. Chrome and Firefox keep separate copies.

- **Export** (top bar) saves a `twig-house-progress.json` backup file. **Import** loads it back, on this browser or another one.
- Clearing your browser's site data wipes progress, so export now and then if you care about it.

## What's in the workshop

- **Start here:** how the workshop talks to you, the three sizes, what to do when the "I don't want to" wall shows up, and a sensory toolkit.
- **Phase 1, Brain and Bench:** the cleaning kit, the chemistry that bites (the never-mix list), and systems for brains that do their own thing.
- **Phase 2, The Shell:** floors, then walls, windows and everything vertical.
- **Phase 3, Rooms, Routines and Machines:** kitchen and bathroom, dishes, laundry, bedrooms and appliance maintenance.
- **Phase 4, The Full House Special:** a deep clean for a house with pets, and cleaners from the garden and pantry.
- **Toolbox:** self-resetting checklists, seasonal and yearly jobs, Rescue Mode for when it's all too much, sleep help, a quick-reference card, free resources, a progress board and a house log.

The examples assume a household with pets and flag the climate-specific bits (hard water, dust, heat, storm season). Keep what fits your house and skip the rest.

## Changing the workshop (optional)

The text lives in `courses/house/course.md`. Edit that file, then from this folder run:

```
python tools/build_course.py
```

This needs Python 3 and no extra packages. It regenerates `courses/house/course.js`, `courses/house/index.html` and the launcher's list. Edit only `course.md`, because the other two files get overwritten on every build. Keep the `id:` line at the top unchanged, or saved progress won't find the course.

## Folder layout

```
index.html              launcher
courses/house/          course.md (the source) and the generated page
courses/catalog.js      generated workshop list for the launcher
framework/              shared engine, widgets, theme and Twig art
tools/build_course.py   the workshop builder
LICENSE                 MIT (everything, art included)
CREDITS.md              who made what
```

## License

[MIT](LICENSE), all of it: code, workshop text and artwork. Twig and the signs are by **Emacartoon**, who released them under MIT. The icons and textures are original to this project. See [CREDITS.md](CREDITS.md).

## Testing and feedback

This is a public test. If something reads wrong, breaks, or doesn't work for your brain, open an issue on the GitHub repository. Notes about what helped are welcome too.

This is general household information, not medical, veterinary or professional advice. Follow product labels, your appliance manuals, and your doctor or vet. In the US, Poison Control is 1-800-222-1222.
