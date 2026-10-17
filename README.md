# rantlib.dev

The website for RANT, the Robotics Automation Networking Toolkit.

- `public/`, `src/`: the site at https://rantlib.dev.
- `docs/`: the docs at https://docs.rantlib.dev. Pages are Markdown in `content/`, listed in `content/nav.json`.
- `explore/`: the web explorer at https://explore.rantlib.dev, an explorer release's page. Bump its version in `explore/page.mjs`.
- `get/`: the install redirect at https://get.rantlib.dev.

## Commands

- `npm run dev`: serve the sites locally.
- `npm run build`: build them.
- `npm run check`: type check.
- `npm run deploy`: deploy all four.
