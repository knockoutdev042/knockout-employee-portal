# Changelog

Documentation of feature work on the Knockout Agency LLP team portfolio site, derived from the project README and git history.

## Overview

The site started as a fully static, zero-dependency team portfolio page generated from an employee Excel sheet (`data/employees.json`). Development since then has focused on two tracks:

1. **CRUD functionality** — turning the read-only directory into a Git-backed employee management tool.
2. **UI/visual redesign** — evolving the look from a basic layout into a glassmorphic, bento-style design system.

---

## `c501365` — Initial commit
Baseline static site: `index.html`, `assets/css/styles.css`, `assets/js/app.js`, and `data/employees.json`, rendering employee cards from JSON with photo/initials-avatar fallback. Deployable to Netlify via drag-and-drop or Git-based deploy (see README).

## `80debca` — Add employee detail modal and Git-backed create/update/delete
The core CRUD feature. Highlights:

- **Employee detail modal**: clicking a card now opens a modal showing full details (email, phone, location, join date, manager, bio) instead of doing nothing.
- **Create / Edit / Delete flows**: an "Add Employee" action plus Edit/Delete actions inside the modal.
- **Netlify Function backend** (`netlify/functions/employees.js`): a serverless API at `/api/employees` implementing:
  - `GET` — list all employees
  - `POST` — create an employee (validates `name`/`department`, derives a unique slug, defaults photo/initials)
  - `PUT ?slug=<slug>` — update an employee by slug (slug itself is immutable)
  - `DELETE ?slug=<slug>` — remove an employee by slug
  - Persistence via the **GitHub Contents API**: every write reads `data/employees.json` at its current SHA and commits the updated file back to the repo, so changes become real, shared, auditable Git history — no database required.
  - Requires a `GITHUB_TOKEN` (fine-grained PAT, Contents: read/write) plus optional `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` overrides (see `.env.example`).
- Auth was explicitly out of scope for this pass.

Files touched: `assets/css/styles.css`, `assets/js/app.js`, `index.html`, `netlify.toml`, `netlify/functions/employees.js` (new).

## `411d278` — Add local dev env template and gitignore
Added `.env.example` documenting the required `GITHUB_TOKEN`/`GITHUB_OWNER`/`GITHUB_REPO`/`GITHUB_BRANCH` variables for local testing with `netlify dev`, plus a `.gitignore` to keep real secrets out of the repo. Notably documents pointing `GITHUB_BRANCH` at a throwaway branch locally, since the function commits for real even when run from a dev machine.

## `a9277fb`, `d61ee60`, `abb8f2a` — Add / Update / Remove employee: Test
Sample data commits (`Test LGhome`) exercising the new create → update → delete flow end-to-end against the live Netlify Function, confirming the Git-backed CRUD pipeline works as designed.

## `18cc8cf` — Redesign UI to glassmorphic bento style
First major visual pass, matching an approved Flowstep design reference:

- Floating glass pill navigation bar.
- Hero section wrapped in a large glass card with blurred ambient gradient orbs.
- Bento-style department grid, with the largest departments rendered as gradient tiles.
- Employee cards restyled as photo-banner cards (gradient + initials fallback when no photo) with overlaid name/role and a department tag.
- Modals reskinned to match: rounded 28px surfaces, avatar rings, pill badges, icon-prefixed form fields.
- Custom delete-confirmation panel (replacing the native `window.confirm`) with an employee preview card.
- Brand red (`#E63A2E`) kept as the accent color instead of the reference design's orange.
- Explicitly a visual-only pass — all existing data, content, and CRUD functionality preserved.

## `8ce288d` — Make department bento grid uniform, redesign hero as navy gradient
- All 12 department cards upgraded to the gradient bento treatment (previously only the top 2 largest departments got it), alternating navy/orange tiles in display order with uniform sizing.
- Hero card restyled with a navy-grey gradient background and bordered, translucent stat tiles (replacing the earlier light glass surface).

## `64e3ac2` — Make all department cards orange instead of alternating navy/orange
- Simplified the department grid to a single consistent orange gradient tile for every department (dropping the navy/orange alternation).
- Removed the now-unused `.dept-card--navy` CSS; navy tokens were retained since the hero still uses them.

---

## Feature Summary

| Area | What was added |
|---|---|
| **CRUD Operations** | Employee detail modal, Add/Edit/Delete flows, `/api/employees` Netlify Function backed by the GitHub Contents API for Git-native persistence |
| **Dev Environment** | `.env.example` + `.gitignore` for local Netlify Function testing without touching real data |
| **UI Redesign** | Glassmorphic bento layout, gradient department tiles, photo-banner employee cards, custom delete-confirmation modal, iterative refinement of the department grid's color treatment |

## Architecture Notes

- **No database**: employee data lives in `data/employees.json` in this repo; the Netlify Function reads/writes it via GitHub's Contents API, so every change is a real, versioned commit.
- **No frontend framework**: vanilla HTML/CSS/JS throughout, per the original zero-dependency design goal.
- **Deployment**: Netlify, either via drag-and-drop or Git-based auto-deploy from `main` (see `README.md` for the full deploy checklist).
