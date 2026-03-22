# Color to Tailwind

A small web app that converts your color code (HEX, RGB, HSL...) to the closest color in the Tailwind color palette.
Built with Astro and React.

## Requirements

- Node v20
- [Web3Forms](https://web3forms.com/) for feedback form submissions

## Notes

The [colors.ts](./src/utils/colors.ts) file holds the Color to Tailwind algorithm. See
the [How it works?](https://colortotailwind.netlify.app/) section for what the algorithm does.

The project uses Nano Stores to [share state](https://docs.astro.build/en/recipes/sharing-state-islands/)
between React components. With this, the site can pass URL path attributes to the components without
wrapping it entirely in React.

## Features

- **Multi-format input:** HEX (3, 4, 6, 8-character), RGB, RGBA, HSL, HSLA, and named CSS colors
- **Alpha / Opacity:** Colors with alpha (e.g. `rgba(59, 130, 246, 0.4)`, `#3B82F666`) output Tailwind classes with opacity (e.g. `blue-500/40`)
- **Tailwind v1–v4 palettes:** Toggle between Tailwind versions with a single click
- **SEO optimized:** Descriptive meta tags; `data-nosnippet` on dynamic content
- **Contrast-aware preview:** Checkerboard pattern behind color swatches for visibility

## Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |
