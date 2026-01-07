import React, { useState, useEffect } from 'react';

/**
 * Fire background using SVG turbulence effect.
 * Three fire elements for full coverage across the button.
 * Based on user-provided code that uses path animation + group transform
 * to create the illusion of fire moving through turbulence.
 * 
 * NOTE: Uses visibility change detection to restart animations when
 * user returns from a backgrounded tab (browsers pause SVG animations).
 */
const FireBackground = () => {
    // Key to force remount and restart animations
    const [animationKey, setAnimationKey] = useState(0);

    // Restart animations when user returns to the tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Force remount by changing key - this restarts all SVG animations
                setAnimationKey(k => k + 1);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);
    const FireSVG = ({ seed, id }) => (
        <svg
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMax slice"
            className="w-full h-full"
        >
            <defs>
                {/* Turbulence filter - creates the wavy fire effect */}
                <filter id={`fireturb-${id}`} x="-100%" y="-100%" width="300%" height="300%">
                    <feTurbulence
                        type="turbulence"
                        baseFrequency="0.06"
                        numOctaves="3"
                        result="turbulence"
                        seed={seed}
                    />
                    <feDisplacementMap in2="turbulence" in="SourceGraphic" scale="35" />
                </filter>
                {/* Fire gradient - radial from bottom center */}
                <radialGradient id={`firegrad-${id}`} cx="50%" cy="100%">
                    <stop offset="0%" stopColor="blue" />
                    <stop offset="20%" stopColor="gold" />
                    <stop offset="60%" stopColor="gold" />
                    <stop offset="100%" stopColor="red" />
                </radialGradient>
            </defs>
            <g>
                {/* Triangle shape with turbulence applied */}
                <path
                    d="M70 200 h60 l-30 -90z"
                    filter={`url(#fireturb-${id})`}
                    fill={`url(#firegrad-${id})`}
                >
                    {/* Triangle shape moving down by animating its path value */}
                    <animate
                        attributeName="d"
                        values="M70 200 h60 l-30 -90z; M70 7200 h60 l-30 -90z"
                        dur="100s"
                        begin="0s"
                        repeatCount="indefinite"
                    />
                </path>
                {/* Group container moving up to keep fire in view */}
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
        <div key={animationKey} className="absolute inset-0 w-full h-full overflow-hidden bg-black rounded-xl">
            {/* Base layer - 3 main flames spread across */}
            <div className="absolute inset-0 flex">
                <div className="w-1/3 h-full">
                    <FireSVG seed={69} id="left" />
                </div>
                <div className="w-1/3 h-full">
                    <FireSVG seed={123} id="center" />
                </div>
                <div className="w-1/3 h-full">
                    <FireSVG seed={420} id="right" />
                </div>
            </div>
            {/* Fill layer - offset flames to cover gaps */}
            <div className="absolute inset-0 flex" style={{ left: '-16.5%' }}>
                <div className="w-1/3 h-full">
                    <FireSVG seed={77} id="fill1" />
                </div>
                <div className="w-1/3 h-full">
                    <FireSVG seed={256} id="fill2" />
                </div>
                <div className="w-1/3 h-full">
                    <FireSVG seed={512} id="fill3" />
                </div>
            </div>
            {/* Extra layer - more offset for seamless coverage */}
            <div className="absolute inset-0 flex" style={{ left: '16.5%' }}>
                <div className="w-1/3 h-full">
                    <FireSVG seed={99} id="extra1" />
                </div>
                <div className="w-1/3 h-full">
                    <FireSVG seed={333} id="extra2" />
                </div>
            </div>
        </div>
    );
};

export default FireBackground;
