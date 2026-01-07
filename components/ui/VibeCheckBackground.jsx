/**
 * Vibe Check Background - Dark purple with twinkling stars
 * Subtle starfield animation with opacity twinkle
 */
export default function VibeCheckBackground() {
    return (
        <div
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{ background: '#1a0a2e' }}
        >
            {/* Stars SVG overlay */}
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 50"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    <style>{`
            @keyframes twinkle {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 1; }
            }
            .star { fill: white; }
            .s1 { animation: twinkle 2s ease-in-out infinite; }
            .s2 { animation: twinkle 2.5s ease-in-out infinite 0.3s; }
            .s3 { animation: twinkle 1.8s ease-in-out infinite 0.6s; }
            .s4 { animation: twinkle 2.2s ease-in-out infinite 0.9s; }
            .s5 { animation: twinkle 3s ease-in-out infinite 1.2s; }
            .s6 { animation: twinkle 1.5s ease-in-out infinite 0.2s; }
            .s7 { animation: twinkle 2.8s ease-in-out infinite 0.7s; }
            .s8 { animation: twinkle 2s ease-in-out infinite 1s; }
          `}</style>
                </defs>
                {/* Star dots */}
                <circle className="star s1" cx="15" cy="12" r="1" />
                <circle className="star s2" cx="35" cy="8" r="0.8" />
                <circle className="star s3" cx="55" cy="15" r="1.2" />
                <circle className="star s4" cx="75" cy="10" r="0.6" />
                <circle className="star s5" cx="85" cy="20" r="1" />
                <circle className="star s6" cx="25" cy="35" r="0.7" />
                <circle className="star s7" cx="65" cy="38" r="0.9" />
                <circle className="star s8" cx="45" cy="25" r="1.1" />
            </svg>

            {/* Subtle purple gradient overlay for depth */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at bottom, rgba(102, 51, 153, 0.3) 0%, transparent 70%)'
                }}
            />
        </div>
    );
}
