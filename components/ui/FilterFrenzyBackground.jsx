/**
 * Filter Frenzy Background - Cyan/Magenta split with pulsing glow
 * Diagonal split design with subtle pulse animation
 */
export default function FilterFrenzyBackground() {
    return (
        <div className="absolute inset-0 rounded-xl overflow-hidden">
            {/* Diagonal split background */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(135deg, #00f5ff 0%, #00f5ff 50%, #ff00ff 50%, #ff00ff 100%)'
                }}
            />

            {/* Pulsing glow overlay */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%)',
                    animation: 'frenzy-pulse 2s ease-in-out infinite'
                }}
            />

            <style>{`
        @keyframes frenzy-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
        </div>
    );
}
