# Color to Tailwind

Paste a HEX, RGB, or HSL color and get the closest Tailwind CSS token.

**Try it:** [colortotailwind.netlify.app](https://colortotailwind.netlify.app)

Built with Astro and React.

## What it does

Type or paste a color. The app scores it against the Tailwind palette with Delta E and shows the closest class, how close the match is, and whether white or black text will read on it.

- **Formats:** HEX (3, 4, 6, or 8 characters), RGB/RGBA, HSL/HSLA, named CSS colors, and Tailwind tokens (`blue-500`, `bg-slate-200`)
- **Alpha:** Colors with opacity (for example `rgba(59, 130, 246, 0.4)` or `#3B82F666`) copy as classes like `blue-500/40`
- **Picker and image sample:** Native color input, or drop / paste / upload a screenshot and click a pixel
- **Tailwind v1–v4:** Switch palettes; share links keep `?hex=` and `?v=`
- **Family filter and custom palettes:** Limit matching to one hue family, or paste your own JSON, `@theme`, or `name: hex` list
- **Copy utilities:** `bg-`, `text-`, `border-`, `ring-`, `fill-`, `stroke-`, `outline-`, and gradient classes, plus batch convert
- **Contrast and nearby matches:** WCAG scores, nearest three matches, shade family, and a dark-mode pair
- **Brand kit:** Complementary, analogous, and neutral Tailwind matches from the current color

## Run locally

You need Node 20.

```sh
npm install
npm run dev
```

The app starts at [localhost:4321](http://localhost:4321). Matching works without any extra setup.

The feedback form is optional. To enable it, add a [Web3Forms](https://web3forms.com/) access key as `PUBLIC_FORM_ACCESS_KEY` in a `.env` file.

## Scripts

| Command             | Action                                    |
| :------------------ | :---------------------------------------- |
| `npm install`       | Install dependencies                      |
| `npm run dev`       | Dev server at `localhost:4321`            |
| `npm run build`     | Type-check, then build to `./dist/`       |
| `npm run preview`   | Preview the production build              |
| `npm test`          | Run Vitest                                |
| `npm run format`    | Format files with Prettier                |
| `npm run astro ...` | Astro CLI (`astro add`, `astro check`, …) |

## How matching works

The algorithm lives in [src/utils/colors.ts](./src/utils/colors.ts). It picks the closest Tailwind color with Delta E — a score for how different two colors look.

Share links pass the color and Tailwind version through the URL. [Nano Stores](https://docs.astro.build/en/recipes/sharing-state-islands/) move that state between Astro and the React islands without wrapping the whole page in React.

The on-site [How it works](https://colortotailwind.netlify.app/#how-it-works) section walks through the same idea in fewer words.

## Credits

This is a fork of [Mihail](https://github.com/mihailthebuilder/hex-tailwind)’s [Hex to Tailwind](https://hextotailwind.com/).

## License

[MIT](./LICENSE)
