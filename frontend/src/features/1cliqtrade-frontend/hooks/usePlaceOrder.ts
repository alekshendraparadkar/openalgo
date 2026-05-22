/**
 * usePlaceOrder - Hook for placing orders
 * Handles order placement with loading/success/error states
 */

import { useState, useCallback } from 'react';
import { placeOrder } from '../services/cliqtradeAPIEnhanced';
import type { PlaceOrderRequest, Order } from '../types/index';
import { createLogger } from '../utils/logger';

const logger = createLogger('usePlaceOrder');

export interface UsePlaceOrderState {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  order: Order | null;
}

export function usePlaceOrder() {
  const [state, setState] = useState<UsePlaceOrderState>({
    isLoading: false,
    error: null,
    successMessage: null,
    order: null,
  });

  const place = useCallback(async (orderData: PlaceOrderRequest) => {
    setState({
      isLoading: true,
      error: null,
      successMessage: null,
      order: null,
    });

    try {
      logger.info('📤 Placing order', { orderData });
      const response = await placeOrder(orderData);

      if (response.status === 'success' && response.data) {
        const successMsg = `✅ Order placed: ${orderData.action} ${orderData.quantity} @ ${orderData.price || 'Market'}`;
        setState({
          isLoading: false,
          error: null,
          successMessage: successMsg,
          order: response.data,
        });
        logger.info('✅ Order placed successfully', { orderid: response.data.orderid });
        return response.data;
      } else {
        const errorMsg = response.message || 'Failed to place order';
        setState({
          isLoading: false,
          error: errorMsg,
          successMessage: null,
          order: null,
        });
        logger.warn('❌ Order placement failed', { message: errorMsg });
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setState({
        isLoading: false,
        error: errorMsg,
        successMessage: null,
        order: null,
      });
      logger.error('❌ Error placing order', { error: errorMsg });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      successMessage: null,
      order: null,
    });
  }, []);

  return { ...state, place, reset };
}
