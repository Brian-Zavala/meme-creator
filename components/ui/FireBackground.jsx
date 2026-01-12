import React, { useMemo } from 'react';
import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Fire background using SVG turbulence effect.
 * ULTRA-ROBUST: Uses CSS Keyframe Animations which are natively handled by the browser
 * and automatically resume when tabs are switched or restored.
 *
/**
 * Fire background.
 * - MOBILE: Uses Lottie animation (fire.json) for performance and reliability.
 * - DESKTOP: Uses SVG turbulence + CSS keyframes for a high-fidelity "magma" effect.
 */
const FireBackground = () => {
    // Robust Mobile Detection
    const isMobile = useMemo(() => {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent;
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const touchSupport = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const smallScreen = typeof window !== 'undefined' && window.innerWidth < 1024;

        return mobileUA || (smallScreen && touchSupport);
    }, []);

    if (isMobile) {
        return (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black rounded-xl flex items-center justify-center">
                 <LottieAnimation
                    src="/animations/fire.json"
                    className="w-full h-full opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(4.5)', translate: '0 -26px' }}
                 />
            </div>
        );
    }

    const FireSVG = ({ seed, id }) => (
        <svg
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMax slice"
            className="w-full h-full"
        >
            <defs>
                <style>{`
                    @keyframes fireTransform-${id} {
                        0% { transform: translateY(0); }
                        100% { transform: translateY(-7000px); }
                    }
                    @keyframes firePath-${id} {
                        0% { d: path("M70 200 h60 l-30 -90z"); }
                        100% { d: path("M70 7200 h60 l-30 -90z"); }
                    }
                `}</style>
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
                <radialGradient id={`firegrad-${id}`} cx="50%" cy="100%">
                    <stop offset="0%" stopColor="blue" />
                    <stop offset="20%" stopColor="gold" />
                    <stop offset="60%" stopColor="gold" />
                    <stop offset="100%" stopColor="red" />
                </radialGradient>
            </defs>
            <g style={{
                animation: `fireTransform-${id} 100s infinite linear`
            }}>
                <path
                    d="M70 200 h60 l-30 -90z"
                    filter={`url(#fireturb-${id})`}
                    fill={`url(#firegrad-${id})`}
                    style={{
                        animation: `firePath-${id} 100s infinite linear`
                    }}
                />
            </g>
        </svg >
    );

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black rounded-xl">
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
            {/* Mid Right Layer - Fill gap slightly right of center */}
            <div className="absolute inset-0 flex" style={{ left: '32%' }}>
                <div className="w-1/3 h-full"><FireSVG seed={444} id="midRight1" /></div>
                <div className="w-1/3 h-full"><FireSVG seed={555} id="midRight2" /></div>
            </div>
            {/* Far Right Layer */}
            <div className="absolute inset-0 flex" style={{ left: '50%' }}>
                <div className="w-1/3 h-full"><FireSVG seed={801} id="farRight1" /></div>
                <div className="w-1/3 h-full"><FireSVG seed={802} id="farRight2" /></div>
                <div className="w-1/3 h-full"><FireSVG seed={803} id="farRight3" /></div>
            </div>
        </div>
    );
};

export default FireBackground;
