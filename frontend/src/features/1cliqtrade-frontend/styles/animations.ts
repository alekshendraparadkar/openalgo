/**
 * Animations for 1CliqTrade Modal
 * Tailwind CSS custom animations and transitions
 */

/**
 * Add to tailwind.config.ts extend section:
 * 
 * theme: {
 *   extend: {
 *     animation: {
 *       // Modal animations
 *       fadeIn: 'fadeIn 0.2s ease-in-out',
 *       slideUp: 'slideUp 0.3s ease-out',
 *       slideDown: 'slideDown 0.3s ease-in',
 *       
 *       // Data update animations
 *       pulse: 'pulse 0.5s ease-in-out',
 *       
 *       // Loading animations
 *       spin: 'spin 1s linear infinite',
 *     },
 *     keyframes: {
 *       fadeIn: {
 *         '0%': { opacity: '0' },
 *         '100%': { opacity: '1' },
 *       },
 *       slideUp: {
 *         '0%': { transform: 'translateY(10px)', opacity: '0' },
 *         '100%': { transform: 'translateY(0)', opacity: '1' },
 *       },
 *       slideDown: {
 *         '0%': { transform: 'translateY(-10px)', opacity: '1' },
 *         '100%': { transform: 'translateY(10px)', opacity: '0' },
 *       },
 *       pulse: {
 *         '0%, 100%': { backgroundColor: 'rgba(255, 193, 7, 0)' },
 *         '50%': { backgroundColor: 'rgba(255, 193, 7, 0.3)' },
 *       },
 *     },
 *     opacity: {
 *       '5': '0.05',
 *       '95': '0.95',
 *     },
 *   },
 * }
 */

export const modalAnimations = {
    // Modal entry/exit
    'animate-fadeIn': 'fadeIn 0.2s ease-in-out',
    'animate-slideUp': 'slideUp 0.3s ease-out',
    'animate-slideDown': 'slideDown 0.3s ease-in',

    // Data updates
    'animate-pulse': 'pulse 0.5s ease-in-out',
    'animate-pulse-green': 'pulse-green 1.5s ease-in-out',
    'animate-pulse-red': 'pulse-red 1.5s ease-in-out',

    // Loading
    'animate-spin': 'spin 1s linear infinite',
};

/**
 * Keyframe definitions for Tailwind CSS
 */
export const keyframes = {
    fadeIn: {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
    },
    slideUp: {
        '0%': { transform: 'translateY(10px)', opacity: '0' },
        '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    slideDown: {
        '0%': { transform: 'translateY(-10px)', opacity: '1' },
        '100%': { transform: 'translateY(10px)', opacity: '0' },
    },
    pulse: {
        '0%, 100%': { backgroundColor: 'rgba(255, 193, 7, 0)' },
        '50%': { backgroundColor: 'rgba(255, 193, 7, 0.3)' },
    },
    'pulse-green': {
        '0%, 100%': { backgroundColor: 'rgba(34, 197, 94, 0)' },
        '50%': { backgroundColor: 'rgba(34, 197, 94, 0.3)' },
    },
    'pulse-red': {
        '0%, 100%': { backgroundColor: 'rgba(239, 68, 68, 0)' },
        '50%': { backgroundColor: 'rgba(239, 68, 68, 0.3)' },
    },
};

/**
 * Animation utilities
 */
export function getPulseAnimationClass(type: 'yellow' | 'green' | 'red' = 'yellow'): string {
    const animations = {
        yellow: 'animate-pulse bg-yellow-50',
        green: 'animate-pulse-green bg-green-50',
        red: 'animate-pulse-red bg-red-50',
    };

    return animations[type] || animations.yellow;
}

/**
 * Responsive animation utilities
 */
export const responsiveAnimations = {
    // Disable animations on slow connections (prefers-reduced-motion)
    prefersReducedMotion: {
        '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
                'animation-duration': '0.01ms !important',
                'animation-iteration-count': '1 !important',
                'transition-duration': '0.01ms !important',
            },
        },
    },

    // Adjust animation speeds for different screen sizes
    mobileAnimations: {
        '@media (max-width: 640px)': {
            'animation-duration': '0.2s',
        },
    },
};
