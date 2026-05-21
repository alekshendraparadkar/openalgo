/**
 * Responsive design utilities for 1CliqTrade
 * Mobile-first responsive styles and utilities
 */

export const responsiveClasses = {
    /**
     * Modal dimensions (responsive)
     */
    modal: {
        desktop: 'w-[1000px] h-[700px]',
        tablet: 'max-w-[90vw] max-h-[90vh]',
        mobile: 'w-full h-full',
    },

    /**
     * Grid layouts
     */
    grid: {
        summary: {
            desktop: 'grid-cols-3',
            tablet: 'grid-cols-2',
            mobile: 'grid-cols-1',
        },
        cards: {
            desktop: 'grid-cols-4',
            tablet: 'grid-cols-2',
            mobile: 'grid-cols-1',
        },
    },

    /**
     * Table responsive classes
     */
    table: {
        // Hide columns on mobile
        hideOnMobile: 'hidden md:block',
        hideOnTablet: 'hidden lg:block',

        // Stack on mobile
        stackOnMobile: 'flex flex-col md:table-row',
    },

    /**
     * Font sizes (responsive)
     */
    fontSize: {
        heading: 'text-lg md:text-xl lg:text-2xl',
        subheading: 'text-sm md:text-base',
        body: 'text-xs md:text-sm',
    },

    /**
     * Padding/Spacing (responsive)
     */
    spacing: {
        padding: 'p-2 md:p-3 lg:p-4',
        gap: 'gap-2 md:gap-3 lg:gap-4',
    },
};

/**
 * Mobile breakpoint constants (matching Tailwind)
 */
export const breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

/**
 * Helper to check current breakpoint
 */
export function getCurrentBreakpoint(): keyof typeof breakpoints {
    const width = typeof window !== 'undefined' ? window.innerWidth : 0;

    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
}

/**
 * React hook for responsive utilities
 */
import { useEffect, useState } from 'react';

export function useResponsive() {
    const [breakpoint, setBreakpoint] = useState<keyof typeof breakpoints>('md');
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const current = getCurrentBreakpoint();
            setBreakpoint(current);
            setIsMobile(current === 'xs' || current === 'sm');
            setIsTablet(current === 'md' || current === 'lg');
            setIsDesktop(current === 'xl' || current === '2xl');
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return { breakpoint, isMobile, isTablet, isDesktop };
}

/**
 * Responsive column configuration for tables
 */
export const tableColumnConfig = {
    // Desktop view - show all columns
    desktop: {
        position: ['Symbol', 'Qty', 'Avg Price', 'LTP', 'P&L %'],
        order: ['Symbol', 'Action', 'Qty', 'Price', 'Filled', 'Status', 'Actions'],
        trade: ['Symbol', 'Action', 'Qty', 'Fill Price', 'Time'],
    },

    // Tablet view - hide less important columns
    tablet: {
        position: ['Symbol', 'Qty', 'LTP', 'P&L %'],
        order: ['Symbol', 'Qty', 'Status', 'Actions'],
        trade: ['Symbol', 'Qty', 'Fill Price'],
    },

    // Mobile view - show only essential columns
    mobile: {
        position: ['Symbol', 'LTP', 'P&L %'],
        order: ['Symbol', 'Status'],
        trade: ['Symbol', 'Price'],
    },
};
