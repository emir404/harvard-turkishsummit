# Harvard Türkiye Summit 2027

The website for the second Harvard Türkiye Summit: *Türkiye Beyond the Crossroads: From Regional Power to Global Force*, Saturday, May 1, 2027, at the David Rubenstein Treehouse.

Built with Next.js (App Router), TypeScript and Tailwind CSS.

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
| `/` | Home: hero, about, mission, 2027 theme, speakers, program, tickets and pre-registration, organizers, sponsors, mailing list |
| `/register/summit` | Summit registration, step 2 of 3 ("Your details") |
| `/register/gala` | Gala registration, step 2 of 3 |

## Where things live

- `src/content/summit.ts`: every piece of copy and data (dates, schedule, panels, team, sponsor tiers, footer links). Edit the site here.
- `src/app/globals.css`: the design tokens (colours, the extra type sizes, page width).
- `src/components/sections/`: one file per section of the home page.
- `src/components/registration/`: the registration page and its form.
- `src/components/ui/`: links and buttons, section scaffolding and the form fields (built on Base UI).
- `src/components/treehouse/`: the venue line drawing.

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

## The Treehouse drawing

The hero drawing is generated, not traced. `scripts/treehouse/treehouse.py` holds a measured 3D model of the David Rubenstein Treehouse (plan outline, three levels, the timber trees and zigzag, built from the published plans and elevations), projects it and removes hidden lines. To change the angle or framing:

```bash
pip install shapely
python scripts/treehouse/treehouse.py hero.svg width=1440 az=26 camh=90 dist=800 \
    ml=0.4433 mr=0.0412 mt=0.012 mb=0.08 pad=0 bleed=0.65
node scripts/treehouse/svg-to-ts.mjs hero.svg
```

`az` is the camera bearing in degrees west of north, `camh` its height in feet and `dist` its distance. Add `preview=1` for an SVG you can open directly.
