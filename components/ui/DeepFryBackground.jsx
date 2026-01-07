/**
 * DeepFryBackground - Placeholder for chicken deep fry SVG
 * User will provide SVG to replace the placeholder
 */
export default function DeepFryBackground() {
    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl bg-gradient-to-br from-orange-600 via-yellow-500 to-orange-700">
            {/* Bubbling oil effect */}
            <div className="absolute inset-0 opacity-40">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-yellow-300/60 animate-ping"
                        style={{
                            width: `${8 + Math.random() * 12}px`,
                            height: `${8 + Math.random() * 12}px`,
                            left: `${10 + (i * 12)}%`,
                            bottom: `${10 + Math.random() * 30}%`,
                            animationDelay: `${i * 0.3}s`,
                            animationDuration: `${1 + Math.random()}s`
                        }}
                    />
                ))}
            </div>
            {/* Placeholder for user's chicken SVG */}
            <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-60">
                🍗
            </div>
        </div>
    );
}
