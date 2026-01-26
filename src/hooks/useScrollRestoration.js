import { useEffect, useRef } from 'react';

/**
 * Custom hook for scroll position restoration
 * Saves scroll position to sessionStorage and restores it when returning to the page
 * 
 * @param {boolean} isLoading - Whether data is still loading
 * @param {string} storageKey - Key to use for sessionStorage (default: 'productListScrollPosition')
 */
const useScrollRestoration = (isLoading = false, storageKey = 'productListScrollPosition') => {
    const hasRestoredRef = useRef(false);

    // Restore scroll position after data loads
    useEffect(() => {
        if (!isLoading && !hasRestoredRef.current) {
            const savedPosition = sessionStorage.getItem(storageKey);

            if (savedPosition) {
                // Use setTimeout to ensure DOM is fully rendered
                setTimeout(() => {
                    const position = parseInt(savedPosition, 10);
                    window.scrollTo({
                        top: position,
                        behavior: 'instant' // Instant scroll for seamless UX
                    });

                    // Clear the saved position after restoration
                    sessionStorage.removeItem(storageKey);
                    hasRestoredRef.current = true;

                    console.log(`[Scroll Restoration] Restored to position: ${position}px`);
                }, 100);
            }
        }
    }, [isLoading, storageKey]);

    // Save current scroll position
    const saveScrollPosition = () => {
        const currentPosition = window.scrollY;
        sessionStorage.setItem(storageKey, currentPosition.toString());
        console.log(`[Scroll Restoration] Saved position: ${currentPosition}px`);
    };

    // Check if there's a saved position
    const hasSavedPosition = () => {
        return sessionStorage.getItem(storageKey) !== null;
    };

    return {
        saveScrollPosition,
        hasSavedPosition
    };
};

export default useScrollRestoration;
