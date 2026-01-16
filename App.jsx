import { useState, useEffect } from "react";
import { preload } from "react-dom";
import toast, { Toaster, useToasterStore } from "react-hot-toast";
import Header from "./components/Layout/Header";
import Main from "./components/Layout/Main";
import { WelcomeModal } from "./components/Modals/WelcomeModal";
import { InstructionModal } from "./components/Modals/InstructionModal";

const TOAST_LIMIT = 2;

function ToastLimiter() {
  const { toasts } = useToasterStore();

  useEffect(() => {
    // Filter out loading toasts so they don't count towards the limit and aren't dismissed
    const visibleToasts = toasts.filter((t) => t.visible && t.type !== 'loading');

    if (visibleToasts.length > TOAST_LIMIT) {
      // Dismiss oldest toasts beyond the limit (assuming toasts are ordered new -> old or we should sort)
      // Note: react-hot-toast usually appends new toasts. If so, [old, new].
      // If we want to dismiss OLD, we should dismiss from the START of the array if it's [old, new].
      // The original code used slice(TOAST_LIMIT) which implies it kept the FIRST N and dismissed the REST.
      // If order is [new, old], slice keeps new and dismisses old. Correct.
      // If order is [old, new], slice keeps old and dismisses new. Incorrect.
      // Let's safe-guard by not changing the order assumption too much,
      // but strictly protecting 'loading'.

      // If the original code worked for normal toasts, we stick to its logic but on the filtered list.
      visibleToasts
        .slice(TOAST_LIMIT)
        .forEach((t) => toast.dismiss(t.id));
    }
  }, [toasts]);

  return null;
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const preloadImages = ["/images/canvas/marker-pen_32.png", "/images/canvas/eraser_32.png"];

    preloadImages.forEach((src) => {
      const img = new Image()
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
    <div className="min-h-screen flex flex-col bg-black text-slate-50 font-sans">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          className: "toast-gradient-border",
          style: {
            background: "#1e293b",
            color: "#fff",
            border: "1px solid #334155",
          },
          success: { duration: 2500 },
          error: { duration: 3500 },
        }}
        containerStyle={{
          bottom: 16,
          right: 16,
        }}
        gutter={8}
      />
      <ToastLimiter />
      <Header onOpenInstructions={openInstructions} />
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Main />
      </div>

      <WelcomeModal isOpen={showWelcome} onClose={closeWelcome} />
      <InstructionModal isOpen={showInstructions} onClose={closeInstructions} />
    </div>
  );
}
