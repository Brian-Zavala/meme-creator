import { useRef, useEffect } from 'react';

export const useLockBodyScroll = () => {
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // 1. Function to LOCK scrolling
        const lockScroll = () => {
            document.body.style.overflow = 'hidden';
            // Mobile Safari sometimes ignores overflow: hidden without this:
            document.body.style.touchAction = 'none'; 
        };

        // 2. Function to UNLOCK scrolling
        const unlockScroll = () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        };

        // 3. Attach listeners
        // We use passive: false just in case, though for this technique it matters less
        element.addEventListener('touchstart', lockScroll, { passive: false });
        element.addEventListener('touchend', unlockScroll);
        element.addEventListener('touchcancel', unlockScroll); // Handle gesture cancellation

        return () => {
            // Cleanup: Always unlock if the component dies
            unlockScroll();
            element.removeEventListener('touchstart', lockScroll);
            element.removeEventListener('touchend', unlockScroll);
            element.removeEventListener('touchcancel', unlockScroll);
        };
    }, []);

    return ref;
};
