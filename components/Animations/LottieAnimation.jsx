import React, { Suspense, useState, useEffect, useRef } from 'react';

// Use DotLottieWorkerReact -- offloads ALL animation rendering to a Web Worker.
// This completely eliminates main thread blocking from Lottie animations.
const LazyDotLottieWorker = React.lazy(() =>
    import('@lottiefiles/dotlottie-react').then(module => ({
        default: module.DotLottieWorkerReact
    }))
);

/**
 * Convert relative URLs to absolute for Web Worker compatibility.
 * Workers can't resolve relative paths like "/animations/fire.json"
 * because they don't share the page's base URL.
 */
function toAbsoluteUrl(src) {
    if (!src) return src;
    // Already absolute
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')) {
        return src;
    }
    // Relative path -> absolute
    try {
        return new URL(src, window.location.origin).href;
    } catch {
        return src;
    }
}

/**
 * LottieAnimation Component
 *
 * Renders Lottie animations via Web Worker (off main thread).
 * - Uses DotLottieWorkerReact to prevent main thread blocking
 * - Shared workerId groups animations into a single worker
 * - freezeOnOffscreen pauses animations when not in viewport
 * - IntersectionObserver-based lazy mounting (only loads when visible)
 * - Converts relative URLs to absolute for Worker compatibility
 */
const LottieAnimation = ({
    src,
    loop = true,
    autoplay = true,
    className = '',
    style = {},
    width = '100%',
    height = '100%',
    workerId = 'shared-lottie-worker',
    ...props
}) => {
    const containerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    // Only mount the animation when the container scrolls into view.
    // This prevents all remix backgrounds from initializing simultaneously.
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

    // Convert relative src to absolute for Worker fetch compatibility
    const absoluteSrc = toAbsoluteUrl(src);

    // Dynamic DPI for quality
    const dpr = typeof window !== 'undefined'
        ? (window.innerWidth >= 1024 ? Math.max(window.devicePixelRatio || 2, 2) : 1)
        : 1;

    return (
        <div ref={containerRef} className={className} style={{ width, height, ...style }}>
            {isVisible && (
                <Suspense fallback={<div style={{ width, height }} />}>
                    <LazyDotLottieWorker
                        src={absoluteSrc}
                        loop={loop}
                        autoplay={autoplay}
                        workerId={workerId}
                        renderConfig={{
                            devicePixelRatio: dpr,
                            freezeOnOffscreen: true,
                        }}
                        style={{ width: '100%', height: '100%' }}
                        {...props}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default LottieAnimation;
