import React, { useState, useEffect, useRef, useMemo } from 'react';

// NOTE: We avoid React.lazy + Suspense here because React Concurrent Mode (startTransition)
// causes Suspense boundaries to hide/reveal, which triggers "reappearLayoutEffects".
// This was causing DotLottieWorkerReact to crash with "InvalidStateError: Cannot transfer control from a canvas...".
//
// SOLUTION: Imperative dynamic import in useEffect.
// We load the STANDARD (non-worker) DotLottieReact to avoid transferControlToOffscreen issues entirely.
// The worker version is great for main thread unblocking, but too fragile with React 18/19 transitions for now.

/**
 * LottieAnimation Component
 *
 * Renders Lottie animations using DotLottieReact (standard version).
 * - Code-split via dynamic import in useEffect (no Suspense boundary)
 * - IntersectionObserver-based lazy mounting (only loads/plays when visible)
 * - Immune to React concurrent mode "hide/reveal" crashes
 */
const LottieAnimation = React.memo(({
    src,
    loop = true,
    autoplay = true,
    className = '',
    style = {},
    width = '100%',
    height = '100%',
    // workerId prop is ignored now, but kept for API compatibility
    ...props
}) => {
    const containerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [DotLottieComponent, setDotLottieComponent] = useState(null);

    // 1. Visibility Check (IntersectionObserver)
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        if (typeof IntersectionObserver === 'undefined') {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // 2. Dynamic Import (Code Splitting without Suspense)
    useEffect(() => {
        if (isVisible && !DotLottieComponent) {
            import('@lottiefiles/dotlottie-react').then(module => {
                // Use the standard React component, NOT the worker one
                setDotLottieComponent(() => module.DotLottieReact);
            }).catch(err => {
                console.warn('Failed to load Lottie player:', err);
            });
        }
    }, [isVisible, DotLottieComponent]);


    // Dynamic DPI for quality
    const dpr = typeof window !== 'undefined'
        ? (window.innerWidth >= 1024 ? Math.max(window.devicePixelRatio || 2, 2) : 1)
        : 1;

    // Memoize renderConfig
    const renderConfig = useMemo(() => ({
        devicePixelRatio: dpr,
        freezeOnOffscreen: true,
    }), [dpr]);

    return (
        <div ref={containerRef} className={className} style={{ width, height, ...style }}>
            {isVisible && DotLottieComponent ? (
                <DotLottieComponent
                    src={src}
                    loop={loop}
                    autoplay={autoplay}
                    renderConfig={renderConfig}
                    {...props}
                />
            ) : (
                // Lightweight placeholder while loading
                <div style={{ width, height }} />
            )}
        </div>
    );
});

export default LottieAnimation;
