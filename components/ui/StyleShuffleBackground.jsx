/**
 * Style Shuffle Background - Rainbow gradient with shifting colors
 * Reuses magma-bg keyframes concept for smooth color wave
 */
export default function StyleShuffleBackground() {
    return (
        <div
            className="absolute inset-0 rounded-xl"
            style={{
                background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
                backgroundSize: '400% 400%',
                animation: 'shuffle-wave 3s ease infinite'
            }}
        >
            <style>{`
        @keyframes shuffle-wave {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
        </div>
    );
}
