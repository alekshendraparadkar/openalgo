/**
 * Portal component - Renders children outside the main DOM tree
 * Used for modal isolation to prevent CSS conflicts
 */

import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  elementId: string;
}

/**
 * Portal component that renders children in a specific DOM element
 * Waits for hydration before rendering to avoid SSR issues
 */
export function Portal({ children, elementId }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted after component mounts (prevents SSR hydration mismatch)
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const element = document.getElementById(elementId);

  if (!element) {
    console.warn(`Portal: Element with id "${elementId}" not found in DOM`);
    return null;
  }

  return createPortal(children, element);
}
