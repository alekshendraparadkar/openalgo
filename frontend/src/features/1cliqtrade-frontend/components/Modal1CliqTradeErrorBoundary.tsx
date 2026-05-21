/**
 * Modal1CliqTradeErrorBoundary - Error boundary for 1CliqTrade modal
 * Catches errors within the modal component tree and prevents main app crash
 */

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { createLogger } from '../utils/logger';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

const logger = createLogger('Modal1CliqTradeErrorBoundary');

/**
 * Error boundary that catches errors in the modal component tree
 * Prevents errors in 1CliqTrade from crashing the main OpenAlgo app
 */
export class Modal1CliqTradeErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('💥 Error caught by Modal1CliqTradeErrorBoundary', {
            error: error.toString(),
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="max-w-sm text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h2 className="text-lg font-semibold text-red-600 mb-2">1CliqTrade Error</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            An error occurred in the 1CliqTrade interface. Please close this modal and try again.
                        </p>
                        <p className="text-xs text-red-500 mb-6 break-words">{this.state.error?.message}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
