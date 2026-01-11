# Meme Creator

Meme Creator is a high-performance web application designed for precision meme generation. Built on React 19 and Tailwind CSS v4, it bridges the gap between simple text-over-image tools and complex photo editors. The focus here is on speed, privacy, and granular control.

Unlike standard generators that rely heavily on server-side processing, this application leverages client-side technologies—including WebAssembly and multi-threaded AI—to handle heavy tasks like background removal directly in the browser.

## Core Capabilities

**Precision Editor**
A fully interactive canvas supporting multiple text layers and stickers. It features drag-and-drop positioning, resizing, and rotation with a snappy, native-app feel.

**Client-Side AI Background Removal**
Upload any image as a custom sticker and instantly isolate the subject. This feature runs entirely in the browser using ONNX Runtime and WebAssembly. No data is sent to a server, ensuring privacy and zero latency after the initial model load.

**Tenor Sticker Integration**
Integrated directly with the Tenor API to fetch transparent animated stickers. The search logic filters specifically for overlay-ready assets rather than standard opaque GIFs, ensuring clean compositions.

**Smart Contextual Captions**
An automated "Magic" caption system that analyzes the selected template context to generate relevant, humorous text on the fly.

**Robust State Management**
Includes a comprehensive history stack with undo/redo functionality (Ctrl+Z / Ctrl+Y). State is automatically synced to local storage, preventing data loss during accidental refreshes.

**Image Processing**
Real-time CSS filter adjustments for contrast, brightness, and blur, applied non-destructively to the canvas.

**Smart GIF Sharing & Privacy**
To enable seamless sharing on platforms like Signal and Discord (which require URLs), we use a hybrid system:
- **Client-Side**: Standard images and raw Tenor GIFs are processed entirely in your browser with zero upload.
**Smart GIF Sharing & Privacy**
To enable seamless sharing on platforms like Signal and Discord (which require URLs), we use a hybrid system:
- **Client-Side**: Standard images and raw Tenor GIFs are processed entirely in your browser with zero upload.
- **Direct Cloud Upload**: Custom GIFs are uploaded **directly from your browser** to `Tmpfiles.org`.
  - **Zero Server Footprint**: The file skips our servers entirely, saving bandwidth and ensuring total privacy.
  - **Auto-Deletion**: Files are automatically deleted by the host after **60 minutes**.
  - **No Logs**: We do not store or inspect your content.
  - **Ephemeral**: The public link expires, ensuring your meme doesn't live on the web forever unless you want it to.

## Technical Architecture

### Frontend Framework
The application is built with **React 19**, utilizing the latest compiler optimizations for efficient rendering. It avoids unnecessary re-renders even with complex canvas manipulations.

### Styling System
**Tailwind CSS v4** drives the UI, providing a modern engine for rapid development. The design system enforces a dark-mode aesthetic with glassmorphism elements to maintain focus on the content.

### The AI Stack
The background removal feature is self-hosted to avoid external dependencies and bandwidth costs.
- **Engine**: ONNX Runtime Web (WASM)
- **Model**: ISNet (FP16 quantization)
- **Optimization**: Multi-threading is enabled via `SharedArrayBuffer`, requiring specific security headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`) in the Vite and Netlify configurations.

### Key Dependencies
- **@imgly/background-removal**: For client-side neural network processing.
- **lucide-react**: Consistent, lightweight iconography.
- **html2canvas**: High-fidelity DOM serialization for export.
- **react-hot-toast**: Context-aware notification system.

## Installation and Setup

### Prerequisites
- Node.js (Latest LTS recommended)
- A Tenor API Key (for sticker search)

### Local Development

1. **Clone the repository**
   ```bash
   git clone [https://github.com/Brian-Zavala/meme-creator.git](https://github.com/Brian-Zavala/meme-creator.git)
   cd meme-creator
