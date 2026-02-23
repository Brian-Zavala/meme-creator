import { useState, useEffect } from "react";
import { preload } from "react-dom";
import { AppToaster } from './components/AppToaster';
import { ExportRecoveryManager } from './components/ExportRecoveryManager';
import Header from "./components/Layout/Header";
import Main from "./components/Layout/Main";
import { WelcomeModal } from "./components/Modals/WelcomeModal";
import { InstructionModal } from "./components/Modals/InstructionModal";
import { PrivacyPolicy } from "./components/Pages/PrivacyPolicy";

export default function App() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path === "/privacy") return "privacy";
    return "home";
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPage(path === "/privacy" ? "privacy" : "home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  const navigateToHome = () => {
    window.history.pushState({}, "", "/");
    setCurrentPage("home");
  };

  if (currentPage === "privacy") {
    return <PrivacyPolicy onBack={navigateToHome} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-slate-50 font-sans">
      {/* AppToaster: custom Toaster that fixes stuck-pausedAt and animation-direction bugs.
          Toast config / durations / limit are all in hooks/useToast.js. */}
      <AppToaster />
      <ExportRecoveryManager />

      <Header onOpenInstructions={openInstructions} />
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Main onOpenInstructions={openInstructions} />
      </div>

      <WelcomeModal isOpen={showWelcome} onClose={closeWelcome} />
      <InstructionModal isOpen={showInstructions} onClose={closeInstructions} />
    </div>
  );
}
