import { useState, useEffect } from "react";
import { preload } from "react-dom";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import Main from "./components/Main";
import { WelcomeModal } from "./components/WelcomeModal";
import { InstructionModal } from "./components/InstructionModal";

export default function App() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const preloadImages = ["/images/canvas/marker-pen_32.png", "/images/canvas/eraser_32.png"];

    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    const welcomeSeen = localStorage.getItem("meme-creator-welcome-seen");
    if (!welcomeSeen) {
      setShowWelcome(true);
    }
  }, []);

  const closeWelcome = () => {
    localStorage.setItem("meme-creator-welcome-seen", "true");
    setShowWelcome(false);

    // After welcome is closed, check if instructions have been seen
    const instructionsSeen = localStorage.getItem("meme-creator-instructions-seen");
    if (!instructionsSeen) {
      setShowInstructions(true);
    }
  };

  const closeInstructions = () => {
    localStorage.setItem("meme-creator-instructions-seen", "true");
    setShowInstructions(false);
  };

  const openInstructions = () => {
    setShowInstructions(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 font-sans">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#fff",
            border: "1px solid #334155",
          },
        }}
      />
      <Header onOpenInstructions={openInstructions} />
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Main />
      </div>

      <WelcomeModal isOpen={showWelcome} onClose={closeWelcome} />
      <InstructionModal isOpen={showInstructions} onClose={closeInstructions} />
    </div>
  );
}

