import React, { useState, useEffect, useRef } from 'react';

/**
 * Fire background using SVG turbulence effect.
 * ULTRA-ROBUST: Multiple mechanisms to ensure animation never freezes:
 * 1. Initial mount with slight delay to ensure DOM is ready
 * 2. Visibility change detection (tab switch)
 * 3. Window focus detection
 * 4. Periodic heartbeat check (every 30s)
 * 5. Intersection Observer for viewport visibility
 */
const FireBackground = () => {
    const [animationKey, setAnimationKey] = useState(() => Date.now());
    const containerRef = useRef(null);
    const lastRestartRef = useRef(Date.now());

    // Force restart animation
    const restartAnimation = () => {
        // Debounce: don't restart more than once per second
        const now = Date.now();
        if (now - lastRestartRef.current < 1000) return;
        lastRestartRef.current = now;
        setAnimationKey(now);
    };

    useEffect(() => {
        // 1. Initial restart with slight delay to ensure mount is complete
        const initialTimer = setTimeout(restartAnimation, 100);

        // 2. Visibility change (tab switch)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                restartAnimation();
            }
        };

        // 3. Window focus
        const handleFocus = () => restartAnimation();

        // 4. Periodic heartbeat - restart every 30 seconds as safety net
        const heartbeat = setInterval(() => {
            if (document.visibilityState === 'visible') {
                restartAnimation();
            }
        }, 30000);

        // 5. Intersection Observer - restart when scrolled into view
        let observer = null;
        if (containerRef.current && 'IntersectionObserver' in window) {
            observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0]?.isIntersecting) {
                        restartAnimation();
                    }
                },
                { threshold: 0.1 }
            );
            observer.observe(containerRef.current);
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(heartbeat);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            if (observer) observer.disconnect();
        };
    }, []);

    const FireSVG = ({ seed, id }) => (
        <svg
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMax slice"
            className="w-full h-full"
        >
            <defs>
                <filter id={`fireturb-${id}-${animationKey}`} x="-100%" y="-100%" width="300%" height="300%">
                    <feTurbulence
                        type="turbulence"
                        baseFrequency="0.06"
                        numOctaves="3"
                        result="turbulence"
                        seed={seed}
                    />
                    <feDisplacementMap in2="turbulence" in="SourceGraphic" scale="35" />
                </filter>
                <radialGradient id={`firegrad-${id}-${animationKey}`} cx="50%" cy="100%">
                    <stop offset="0%" stopColor="blue" />
                    <stop offset="20%" stopColor="gold" />
                    <stop offset="60%" stopColor="gold" />
                    <stop offset="100%" stopColor="red" />
                </radialGradient>
            </defs>
            <g>
                <path
                    d="M70 200 h60 l-30 -90z"
                    filter={`url(#fireturb-${id}-${animationKey})`}
                    fill={`url(#firegrad-${id}-${animationKey})`}
                >
                    <animate
                        attributeName="d"
                        values="M70 200 h60 l-30 -90z; M70 7200 h60 l-30 -90z"
                        dur="100s"
                        begin="0s"
                        repeatCount="indefinite"
                    />
                </path>
                <animateTransform
                    attributeName="transform"
                    attributeType="XML"
                    type="translate"
                    values="0 0; 0 -7000"
                    dur="100s"
                    begin="0s"
                    repeatCount="indefinite"
                />
            </g>
        </svg>
    );

    return (
        <div
            ref={containerRef}
            key={animationKey}
            className="absolute inset-0 w-full h-full overflow-hidden bg-black rounded-xl"
        >
            {/* Base layer - 3 main flames */}
            <div className="absolute inset-0 flex">
                <div className="w-1/3 h-full"><FireSVG seed={69} id="left" /></div>
                <div className="w-1/3 h-full"><FireSVG seed={123} id="center" /></div>
                <div className="w-1/3 h-full"><FireSVG seed={420} id="right" /></div>
            </div>
            {/* Fill layer */}
            <div className="absolute inset-0 flex" style={{ left: '-16.5%' }}>
                <div className="w-1/3 h-full"><FireSVG seed={77} id="fill1" /></div>
                <div className="w-1/3 h-full"><FireSVG seed={256} id="fill2" /></div>
                <div className="w-1/3 h-full"><FireSVG seed={512} id="fill3" /></div>
            </div>
            {/* Extra layer */}
            <div className="absolute inset-0 flex" style={{ left: '16.5%' }}>
                <div className="w-1/3 h-full"><FireSVG seed={99} id="extra1" /></div>
                <div className="w-1/3 h-full"><FireSVG seed={333} id="extra2" /></div>
            </div>
        </div>
    );
};

export default FireBackground;

