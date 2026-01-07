/**
 * Caption Remix Background - Purple gradient with floating bubble particles
 * Subtle animation: bubbles drift upward with opacity fade
 */
export default function CaptionRemixBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
            {/* Purple gradient base */}
            <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            />

            {/* Floating bubbles SVG overlay */}
            <svg
                className="absolute inset-0 w-full h-full opacity-30"
                viewBox="0 0 100 50"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    <style>{`
            @keyframes float-up {
              0% { transform: translateY(60px); opacity: 0; }
              10% { opacity: 0.6; }
              90% { opacity: 0.6; }
              100% { transform: translateY(-10px); opacity: 0; }
            }
            .bubble { fill: white; }
            .b1 { animation: float-up 4s ease-in-out infinite; }
            .b2 { animation: float-up 5s ease-in-out infinite 0.5s; }
            .b3 { animation: float-up 3.5s ease-in-out infinite 1s; }
            .b4 { animation: float-up 4.5s ease-in-out infinite 1.5s; }
            .b5 { animation: float-up 3s ease-in-out infinite 2s; }
          `}</style>
                </defs>
                {/* Speech bubble shapes */}
                <circle className="bubble b1" cx="20" cy="40" r="3" />
                <circle className="bubble b2" cx="40" cy="45" r="2" />
                <circle className="bubble b3" cx="60" cy="38" r="2.5" />
                <circle className="bubble b4" cx="80" cy="42" r="2" />
                <circle className="bubble b5" cx="50" cy="48" r="3.5" />
            </svg>
        </div>
    );
}
