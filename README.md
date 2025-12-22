# Meme Creator Ultra

Meme Creator Ultra is a professional-grade web application designed for creating, customizing, and sharing memes. Built with React 19 and Tailwind CSS v4, it provides a high-performance editor with a focus on user experience and visual precision.

## Core Features

- **Interactive Editor Canvas**: Support for multiple text layers and stickers with precise drag-and-drop positioning.
- **Contextual Magic Captions**: An automated caption generation system that provides relevant text based on the selected meme template.
- **State History Management**: Robust undo and redo functionality with integrated keyboard shortcuts (Ctrl+Z/Ctrl+Y) and gesture support.
- **Image Processing Filters**: Real-time adjustment of contrast, brightness, and blur effects applied directly to the canvas.
- **Persistent Storage**: Automatic state synchronization with local storage to ensure work is preserved across sessions.
- **Advanced Export Options**: High-resolution PNG generation via html2canvas and integration with the Web Share API for native platform sharing.
- **Responsive Design**: A fully adaptive interface optimized for both desktop workstations and mobile devices.

## Technical Architecture

### Frontend Framework
The application utilizes React 19, leveraging the latest features for efficient component rendering and state management.

### Styling and UI
Tailwind CSS v4 is employed for styling, utilizing its modern engine for rapid UI development and consistent design patterns. The interface follows a dark-mode aesthetic with glassmorphism elements.

### Key Dependencies
- **lucide-react**: A comprehensive library of lightweight, consistent icons.
- **html2canvas**: Used for capturing the DOM state and converting it into high-quality image formats.
- **canvas-confetti**: Handles visual feedback animations upon successful meme generation.
- **react-hot-toast**: Manages non-intrusive, accessible notifications for user actions.

## Installation and Setup

### Prerequisites
- Node.js (Latest LTS version)
- npm or yarn

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Brian-Zavala/meme-creator.git
   cd meme-creator
   ```

2. Install the required dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Production Build

To generate an optimized production build, execute:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

## Project Structure

- `components/`: Modular UI components and the specialized MemeEditor sub-system.
- `hooks/`: Custom React hooks, including history management logic.
- `constants/`: Configuration files and template data.
- `images/`: Static asset storage.

## License

This project is intended for educational and creative purposes.
