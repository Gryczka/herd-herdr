# Herd Herdr

Herd Herdr is a dependency-light browser game that teaches Herdr's default keyboard shortcuts through an animated pastoral campaign. It deploys as a static-assets-only Cloudflare Worker.

## Stack

- Vanilla ES modules in `public/`
- Canvas rendering in `public/farm-world.js`
- Campaign data and pure game logic in `public/game-core.js`
- DOM, input, progress, and sound orchestration in `public/game.js`
- Static asset deployment configured by `wrangler.jsonc`
- Vitest, ESLint, and Prettier for verification
- npm with Node.js 22 or newer

## Commands

| Command              | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Run the local Wrangler server                  |
| `npm run lint`       | Check ESLint and Prettier                      |
| `npm run lint:fix`   | Fix lint and formatting issues                 |
| `npm run test`       | Run the test suite once                        |
| `npm run test:watch` | Run Vitest in watch mode                       |
| `npm run build`      | Fix, lint, and create a Wrangler dry-run build |
| `npm run check`      | Run lint, tests, and the full build lifecycle  |
| `npm run deploy`     | Fix, lint, and deploy with Wrangler            |

## Working Conventions

- Keep the app framework-free unless a concrete feature requires otherwise.
- Put reusable, DOM-free rules in `game-core.js` and cover them with targeted tests.
- Treat the Herdr docs as the source of truth for shortcut names and defaults.
- Preserve both physical-keyboard and on-screen-key paths when changing input behavior.
- Verify animated scenes with Chrome DevTools at desktop and narrow mobile sizes.
- Respect `prefers-reduced-motion` and maintain accessible text equivalents for canvas scenes.
- Do not edit generated `dist/`, `.wrangler/`, or `package-lock.json` by hand.
- Run `npm run check` before handing off significant work.

Use short-lived branches off `main`: `feature/<slug>`, `fix/<slug>`, or `chore/<slug>`. Work in small slices, add a failing targeted test first when practical, implement the smallest fix, and avoid batching unrelated changes.

For Workers configuration or deployment changes, retrieve current Cloudflare documentation first. This project has no Worker script or bindings; add type generation only if that architecture changes.
