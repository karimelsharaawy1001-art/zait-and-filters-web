import { useEffect, useRef } from 'react';
import { safeSessionStorage } from '../utils/safeStorage';

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
            try {
                const savedPosition = safeSessionStorage.getItem(storageKey);

                if (savedPosition) {
                    // Use setTimeout to ensure DOM is fully rendered
                    setTimeout(() => {
                        const position = parseInt(savedPosition, 10);
                        window.scrollTo({
                            top: position,
                            behavior: 'instant' // Instant scroll for seamless UX
                        });

                        // Clear the saved position after restoration
                        try {
                            safeSessionStorage.removeItem(storageKey);
                        } catch (e) { }
                        hasRestoredRef.current = true;

                        console.log(`[Scroll Restoration] Restored to position: ${position}px`);
                    }, 100);
                }
            } catch (e) {
                console.error("[Scroll Restoration] Failed to restore scroll", e);
            }
        }
    }, [isLoading, storageKey]);

    // Save current scroll position
    const saveScrollPosition = () => {
        try {
            const currentPosition = window.scrollY;
            safeSessionStorage.setItem(storageKey, currentPosition.toString());
            console.log(`[Scroll Restoration] Saved position: ${currentPosition}px`);
        } catch (e) { }
    };

    // Check if there's a saved position
    const hasSavedPosition = () => {
        try {
            return safeSessionStorage.getItem(storageKey) !== null;
        } catch (e) {
            return false;
        }
    };

    return {
        saveScrollPosition,
        hasSavedPosition
    };
};

export default useScrollRestoration;
