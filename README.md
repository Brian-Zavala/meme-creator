# Meme Creator

A stupid-fast meme generator that runs entirely in your browser. No uploads. No waiting. Just fire it up and start slapping text on images.

Built with React 19 + Tailwind v4. Ships with client-side AI for background removal, animated stickers from Tenor, and a bunch of chaos buttons that randomize everything when you're out of ideas.

**Live at:** [meme-creator.app]([https://meme-creator.app](https://meme-creator.app/)

## What's in the box

**The Editor**
Drag stuff around. Resize it. Rotate it. Add as many text layers as you want. The canvas feels snappy because we're not round-tripping to a server for every action.

**AI Background Removal**
Upload a photo, click remove background, get a transparent sticker. Uses ONNX Runtime + WebAssembly so everything happens locally. Your images never leave your device.

**Tenor Stickers**
Search pulls transparent animated stickers, not regular GIFs. Slap them on your meme, they animate in the export.

**Magic Captions**
Hit the magic button and it picks random captions that (sometimes) make sense for the template you picked.

**Undo/Redo**
Ctrl+Z and Ctrl+Y work like you'd expect. State persists to localStorage so refreshing won't nuke your work.

**Filters**
Contrast, brightness, blur, saturation, hue rotate, deep fry. All applied in real-time on the canvas.

**Chaos Mode**
Six remix buttons that randomize different aspects. Hit "Chaos Mode" if you want to roll the dice on everything at once.

## The stack

```
React 19          - latest compiler, concurrent features
Tailwind CSS v4   - the new engine, not v3
Vite              - dev server + build
ONNX Runtime Web  - WASM-based AI inference
gif.js            - client-side GIF encoding
PostHog           - analytics (optional, proxied through /ph)
```

### Why client-side AI?

No server costs. No upload latency. No privacy concerns. The model (ISNet, FP16) loads once and runs in a Web Worker with SharedArrayBuffer threading. Requires COOP/COEP headers which are set in `netlify.toml` and `vite.config.js`.

### GIF sharing

Platforms like Signal and Discord need URLs to embed GIFs. For custom exports:
- Files upload directly from your browser to `tmpfiles.org`
- Bypasses our servers completely
- Auto-deletes after 60 minutes
- We don't log or store anything

For unmodified Tenor GIFs, we just copy the original URL. No upload needed.

## Running locally

```bash
git clone https://github.com/Brian-Zavala/meme-creator.git
cd meme-creator
npm install
```

Create `.env`:
```
VITE_PUBLIC_TENOR_API_KEY=your_tenor_key
VITE_PUBLIC_POSTHOG_KEY=your_posthog_key  # optional
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Start dev server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Project structure

```
src/
├── components/
│   ├── Layout/         # Header, Main (the big one)
│   ├── MemeEditor/     # Canvas, Toolbar, Inputs, FineTune
│   ├── Modals/         # Welcome, Instructions, Export
│   └── ui/             # Buttons, sliders, backgrounds
├── services/
│   ├── gifExporter.js  # GIF encoding logic
│   └── imageProcessor.js # Deep fry worker
├── hooks/
│   └── useHistory.js   # Undo/redo state management
├── constants/
│   └── textAnimations.js
└── App.jsx
```

`Main.jsx` is the beast. It handles all the meme state, remix logic, export flows, and canvas interactions. Most of the action lives there.

## Deploying

Works out of the box on Netlify. The `netlify.toml` has the security headers needed for SharedArrayBuffer.

Set these env vars in Netlify dashboard:
- `VITE_PUBLIC_TENOR_API_KEY`
- `VITE_PUBLIC_POSTHOG_KEY` (if using analytics)

## Contributing

PRs welcome. The codebase is straightforward React. No weird patterns or over-engineering. Open an issue if something's broken or you have a feature idea.

## License

MIT
