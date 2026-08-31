# Contributing to Herd Herdr

Thank you for helping improve Herd Herdr. This repository is a reference sample, so reviews and support are best-effort, but focused fixes and teaching improvements are welcome.

## How to Contribute

1. Fork the repository and clone your fork.
2. Create a short-lived branch from `main`, such as `feature/<slug>`, `fix/<slug>`, or `chore/<slug>`.
3. Keep the change focused and add a targeted test when practical.
4. Push the branch and open a pull request.

## Development Setup

Herd Herdr requires Node.js 22 or newer and npm.

```sh
git clone https://github.com/Gryczka/herd-herdr.git
cd herd-herdr
npm install
npm run dev
```

Before opening a pull request, run the complete verification suite:

```sh
npm run check
```

Individual checks are also available through `npm run lint`, `npm run test`, and `npm run build`.

## Code Style

- Keep the browser application framework-free unless a feature clearly requires otherwise.
- Put reusable, DOM-free rules in `public/game-core.js` and cover them with Vitest.
- Preserve physical-keyboard, on-screen-key, mobile, accessibility, and reduced-motion behavior.
- Use ESLint and Prettier through `npm run lint`; run `npm run lint:fix` to apply automatic fixes.
- Add comments for intent and non-obvious constraints, not for straightforward syntax.

## Commit Messages

Write concise, imperative commit subjects that describe one logical change, for example `Add shortcut practice retry state`. Separate unrelated work into separate commits.

## Pull Request Process

- Explain the user-visible behavior and why the change is needed.
- Describe how you tested keyboard, touch, and responsive behavior when relevant.
- Include screenshots for visual changes.
- Update README or in-game guidance when behavior or shortcuts change.
- Ensure CI passes without warnings.
- Respond to review feedback with additional commits rather than force-pushing shared review history.

## Bug Reports

Use the [bug report template](https://github.com/Gryczka/herd-herdr/issues/new?template=bug_report.md). Include reproduction steps, expected and actual behavior, browser details, and screenshots where useful.

## Feature Requests

Use the [feature request template](https://github.com/Gryczka/herd-herdr/issues/new?template=feature_request.md). Describe the learning problem first, then the proposed behavior and alternatives considered.

## Code of Conduct

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
