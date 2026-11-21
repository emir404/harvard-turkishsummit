# Harvard Türkiye Summit 2027

The website for the second Harvard Türkiye Summit: *Türkiye Beyond the Crossroads: From Regional Power to Global Force*, Saturday, May 1, 2027, at the David Rubenstein Treehouse.

Built with Next.js (App Router), TypeScript, Tailwind CSS and three.js.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Pages

| Route | What it is |
| --- | --- |
| `/` | Home, told as one story: the Harvard house at dusk (hero), the year's themes, last year's room (about), the Bosphorus at night (mission & vision), the speakers, the day's programme, tickets and pre-registration, the organizing team, partners and the mailing list |
| `/register/summit` | Summit registration, step 2 of 3 ("Your details") |
| `/register/gala` | Gala registration, step 2 of 3 |

## Where things live

- `src/content/summit.ts`: every piece of copy and data (dates, schedule, panels, team, partners, footer links). Edit the site here.
- `src/app/globals.css`: the design tokens (colours, the three section schemes, the extra type sizes, page width) and the motion and drawing rules.
- `src/components/sections/`: one file per section of the home page.
- `src/components/motion/`: the scroll runtime, scroll scenes, rising titles and counting figures.
- `src/components/iso/`: the isometric drawings (generated, in `drawings/`) and the components that show and lazy-load them.
- `src/components/stageshow/`: the iPhone, lock screen and notification from the Stageshow kit (vendored, MIT), used by the phone beside the pre-registration form.
- `src/components/team/`: the team portraits (drawing and photo) and their registry.
- `src/components/registration/`: the registration page and its form.
- `src/components/ui/`: links and buttons, section scaffolding and the form fields (built on Base UI).
- `src/components/harvard-house/`: the interactive drawing in the hero.
- `src/components/treehouse/`: an older perspective line drawing of the venue (not on the page; the isometric Treehouse in `iso/drawings/` replaced it).

## Forms

Pre-registration, the mailing list and both registration forms post to one server action (`src/app/actions.ts`). It validates the fields and forwards them as JSON to the URL in `FORMS_ENDPOINT`:

```json
{ "form": "pre-registration", "submittedAt": "2027-01-15T10:00:00.000Z", "fields": { "email": "…" } }
```

Copy `.env.example` to `.env.local` and set the variable. The site stores nothing itself, so while the variable is empty every form answers with an error instead of appearing to succeed.

## Still to fill in

These are `undefined` in `src/content/summit.ts` and render as plain text until they have a destination:

- Agenda PDF and sponsorship package downloads
- Privacy Policy, Terms of Service and Press Kit pages
- Instagram and LinkedIn profiles, and LinkedIn links for the team
- The treasurer's email address

The payment step that "Continue to payment" leads to is not built.

The About photos are the three from 2026 in `src/assets`. Two of them are only 615 px wide, so they look soft in the large frame on high-density screens; larger files can replace them, and more can be added in `src/components/sections/about.tsx` with their captions in `about.photos`.

## Look and motion

Sections alternate between ink and paper, with crimson for the themes band and the mailing list, so moving from one to the next is a change of colour. A scheme class (`scheme-ink`, `scheme-paper`, `scheme-crimson`) swaps the colour roles, so a component written with `text-fg` or `border-rule` reads right in any of them. Each section opens with its name and a large title (`SectionIntro` in `src/components/ui/section.tsx`).

Motion is kept to the moments that tell the story; sections and cards do not fade in as they scroll by.

- **Hero:** the copy settles in on load; scrolling away turns the building and lifts the camera.
- **Themes:** the line drifts on its own, gathers speed as the page scrolls down, turns round as it scrolls up, and slows under the pointer (`theme-marquee.tsx`).
- **About:** each photo wipes in over the last, which slides back and dims beneath it; the figures count up once.
- **Bosphorus:** drawn by scroll from the European shore to the Asian one, then alive: ferries cross the strait (passing under the bridge), cars run its deck both ways, and windows go dark and come on now and then (`bosphorus-scene.tsx`).
- **Speakers:** a bento of the keynote and the four panels; each scene draws itself in once, and each card leads to its session in the agenda.
- **Program:** no motion and no illustration: the day set as a printed programme, morning, afternoon and evening, each with its sessions.
- **Tickets:** two passes with the scene of their event; a phone on the Bosphorus wallpaper receives the news that tickets are open (`notify-phone.tsx`).
- **Team:** each portrait draws itself in line, and the photo develops over it under the pointer (`team-portrait.tsx`; see below).
- **Between pages:** going into registration the page slides left as the next arrives from the right, and going back to the site slides the other way; switching between the Summit and Gala forms crossfades under a header that stays still. It uses React's `<ViewTransition>` around each page's content, and each link names its direction (`src/lib/page-transition.ts`). The browser's back button doesn't animate, reduced motion gets a short crossfade, and browsers without the View Transitions API swap pages as before.
- **Everywhere:** buttons press in, linked cards lift 2px, text links draw their underline, and links to a section (the navs, the footer, the buttons, the speaker cards, the hero's scroll cue) glide to it. Page changes stay instant (`data-scroll-behavior` on `<html>`), and with reduced motion every link jumps.

Scroll-linked parts sit in a `ScrollScene`, which carries its scroll progress as `--p` (0–1); one scroll listener and one animation frame loop serve them all (`src/lib/scroll-progress.ts`). Drawings and portraits that draw themselves in carry `data-reveal`, which a small runtime (`src/components/motion/motion-runtime.tsx`) turns into `data-shown` the first time they come into view.

Nothing depends on the motion. Without JavaScript, or with reduced motion, every section is shown in its finished state: a `js` class set in `<head>` before first paint is what lets anything start hidden, and it is removed again if the runtime has not started after a few seconds.

## The isometric drawings

The Bosphorus at night, the Treehouse (on the Summit pass) and the six panel scenes (keynote, biotech, energy, economy, geopolitics, gala) are drawn in the hero's language: tonal faces lit like the house, warm lit windows and hairlines, all in the hero's isometric projection. They are generated from procedural 3D models in Blender (hidden lines removed exactly, faces partitioned by the visible edges) and saved as SVG data in `src/components/iso/drawings/`: `paths` (lines, with their draw order), `fills` (faces, each a step on a tone ramp) and `lights` (panes and lamps).

- `IsoDrawing` colours them from the scheme they sit in: the `--iso-f0` to `--iso-f7` ramp and `--iso-light` in `globals.css` read as night on ink (lights on) and day on paper (lights off), so one drawing serves both.
- They draw themselves in when they come into view or, for the Bosphorus, as the page scrolls: lines first, then faces, then lights.
- The Bosphorus is split into layers (`drawings/bosphorus-layers.ts`): water, the ferries (each with its route and pace), land, and the two lanes of the bridge's deck, so moving things pass behind the bridge correctly.
- They are large (the Bosphorus is about 250 KB of path data), so they are not in the page's HTML: `LazyIsoDrawing` (`lazy-iso.tsx`) fetches each one shortly before it scrolls into view, once, and holds its space meanwhile; the Bosphorus scene loads its layers the same way. Without JavaScript the illustrations are left out.
- Scenes that should melt into the page, like the hero, sit in an `edge-mask` (the hero's faded edges, as a utility).

To change a model or regenerate them:

```bash
blender -b --factory-startup --python scripts/iso/render.py -- all [--preview DIR]
```

`render.py` explains the options; the scenes are in `scripts/iso/` (`dioramas.py`, `bosphorus.py`, `treehouse_iso.py`). Keep each drawing's view box as it is, or update it in `lazy-iso.tsx`.

## Team portraits

Each organizer's card shows their portrait drawn in line, and the photo under the pointer. The drawing is made from the photo on your machine, nothing is uploaded:

1. Put the headshot in `src/assets/team/<id>.jpg`, where `<id>` is the slug of their name (`elif-lara-okyay`).
2. `blender -b --factory-startup --python scripts/portraits/outline.py -- src/assets/team/<id>.jpg <id>` writes `src/components/team/portraits/<id>.ts`.
3. Add them to `src/components/team/portraits.ts` (the file shows the line to copy).

Until a member has a photo, their card shows their monogram, drawn in the same line.

## The Harvard house

The hero's building is a model built in code, not a downloaded mesh: `src/components/harvard-house/model.ts` lays out a Georgian river house (a U of ranges round a courtyard, five pedimented fronts, chimneys, and a clock tower with an octagonal belfry and onion dome) as flat faces and explicitly drawn lines. `scene.ts` renders it with three.js as a hidden-line drawing on an isometric grid:

- Drag to turn it; it settles on the nearest isometric view. Arrow keys turn it too.
- Hovering lights the rooms under the pointer; a click (or Enter) sends a wave of light through the building.
- The tower clocks keep Cambridge time, and lamps come on and off now and then.
- It draws itself in on load, and holds still for visitors who prefer reduced motion.

- Scrolling the hero away turns the building by up to 60° and lifts the camera a little, while the copy drifts up and fades.

three.js loads only after the page is up, and frames are drawn only while something moves. The framing comes from CSS custom properties on the canvas wrapper (`--house-x`, `--house-y`, `--house-fill`), set per breakpoint in `src/components/sections/hero.tsx`.

## The Treehouse drawing

The venue drawing is generated, not traced. `scripts/treehouse/treehouse.py` holds a measured 3D model of the David Rubenstein Treehouse (plan outline, three levels, the timber trees and zigzag, built from the published plans and elevations), projects it and removes hidden lines. To change the angle or framing:

```bash
pip install shapely
python scripts/treehouse/treehouse.py hero.svg width=1440 az=26 camh=90 dist=800 \
    ml=0.4433 mr=0.0412 mt=0.012 mb=0.08 pad=0 bleed=0.65
node scripts/treehouse/svg-to-ts.mjs hero.svg
```

`az` is the camera bearing in degrees west of north, `camh` its height in feet and `dist` its distance. Add `preview=1` for an SVG you can open directly.
