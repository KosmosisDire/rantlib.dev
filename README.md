# rantlib.dev

The website for RANT, the Robotics Automation Networking Toolkit.

- `public/`, `src/`: the site at https://rantlib.dev.
- `docs/`: the docs at https://docs.rantlib.dev. Pages are Markdown in `content/`, listed in `content/nav.json`. A
  page whose entry names `from` is read from that project's default branch instead, as the HMI pages are. Build with
  `HMI_SOURCE=../hmi-rant` to read a checkout.
- `explore/`: the web explorer at https://explore.rantlib.dev, an explorer release's page. Bump its version in `explore/page.mjs`.
- `pack/`: the package viewer at https://pack.rantlib.dev, built from the package database and each package's latest release.
- `get/`: the install redirect at https://get.rantlib.dev.

## Commands

- `npm run dev`: serve the sites locally.
- `npm run build`: build them.
- `npm run check`: type check.
- `npm run deploy`: deploy all five.
