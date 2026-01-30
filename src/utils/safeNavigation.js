import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Safe Navigation Hook
 * Wraps react-router-dom navigation in try-catch to prevent SecurityError
 * from crashing the app in restricted browser environments.
 */
export const useSafeNavigation = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const safeNavigate = useCallback((to, options = {}) => {
        try {
            navigate(to, options);
        } catch (error) {
            console.error('[SafeNavigation] Navigation failed:', error);
            if (error.name === 'SecurityError') {
                console.warn('[SafeNavigation] SecurityError detected. Switching to Pure State behavior.');
                window.isPureStateMode = true;
                // Fallback: Use window.location for hard navigation if possible, 
                // or just let the React state handle the view if navigate is completely blocked.
            }
        }
    }, [navigate]);

    const safeSetSearchParams = useCallback((nextInit, navigateOptions = {}) => {
        try {
            setSearchParams(nextInit, navigateOptions);
        } catch (error) {
            console.error('[SafeNavigation] setSearchParams failed:', error);
            if (error.name === 'SecurityError') {
                window.isPureStateMode = true;
            }
        }
    }, [setSearchParams]);

    return {
        navigate: safeNavigate,
        searchParams,
        setSearchParams: safeSetSearchParams
    };
};
