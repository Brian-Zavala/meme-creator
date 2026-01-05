import { useEffect } from 'react';

export const useLockBodyScroll = (lock = true) => {
    useEffect(() => {
        if (!lock) return;

        // Get original body overflow
        const originalStyle = window.getComputedStyle(document.body).overflow;
        const originalTouchAction = window.getComputedStyle(document.body).touchAction;

        // Prevent scrolling on mount
        document.body.style.overflow = 'hidden';
        // Mobile Safari sometimes ignores overflow: hidden without this:
        document.body.style.touchAction = 'none'; 

        // Re-enable scrolling when component unmounts or lock changes
        return () => {
            document.body.style.overflow = originalStyle;
            document.body.style.touchAction = originalTouchAction;
        };
    }, [lock]); 
};
