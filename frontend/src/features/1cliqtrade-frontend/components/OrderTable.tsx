/**
 * OrderTable - Orders (OrderBook) tab component
 * Displays active and completed orders with WebSocket integration
 */

import { useEffect, useState, useCallback } from 'react';
import { useOrders, useCancelOrder } from '../hooks/useCliqTrade1API';
import { useWebSocketOrderUpdates } from '../hooks/useWebSocketOrders';
import type { OrderUpdateMessage } from '../hooks/useWebSocketOrders';
import { cn } from '@/lib/utils';
import type { Order } from '../types/index';

/**
 * Orders tab - shows user's orders with real-time updates
 */
export function OrderTable() {
  const { data: orders = [], isLoading, error, refetch } = useOrders();
  const cancelOrderMutation = useCancelOrder();
  const [localOrders, setLocalOrders] = useState<Order[]>([]);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const { handleOrderUpdate } = useWebSocketOrderUpdates();

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const onOrderUpdate = useCallback((updatedOrder: OrderUpdateMessage) => {
    setUpdating((prev) => new Set([...prev, updatedOrder.orderid]));
    setLocalOrders((prev) =>
      prev.map((order) => order.orderid === updatedOrder.orderid ? { ...order, quantity: updatedOrder.quantity, filledQuantity: updatedOrder.filled_quantity, averagePrice: updatedOrder.average_price, status: updatedOrder.status as 'PENDING' | 'COMPLETE' | 'REJECTED' | 'CANCELLED' } : order)
    );
    setTimeout(() => {
      setUpdating((prev) => { const next = new Set(prev); next.delete(updatedOrder.orderid); return next; });
    }, 500);
  }, []);

  useEffect(() => {
    return handleOrderUpdate(onOrderUpdate);
  }, [handleOrderUpdate, onOrderUpdate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm('Cancel this order?')) {
      cancelOrderMutation.mutate(orderId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div><p className="text-sm text-muted-foreground">Loading orders...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm"><p className="text-sm font-semibold text-red-600 mb-2">Error loading orders</p><p className="text-xs text-red-500 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p><button onClick={() => refetch()} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">Retry</button></div>
      </div>
    );
  }

  if (localOrders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No orders
      </div>
    );
  }

  const pendingOrders = localOrders.filter((o) => o.status === 'PENDING');

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="border-b border-border px-4 py-3 bg-muted/50">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div><p className="text-muted-foreground mb-1">Total Orders</p><p className="font-semibold">{localOrders.length}</p></div>
          <div><p className="text-muted-foreground mb-1">Pending Orders</p><p className="font-semibold text-yellow-600">{pendingOrders.length}</p></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 border-b border-border">
            <tr><th className="text-left py-2 px-3 font-semibold">Symbol</th><th className="text-center py-2 px-3 font-semibold">Action</th><th className="text-right py-2 px-3 font-semibold">Qty</th><th className="text-right py-2 px-3 font-semibold">Price</th><th className="text-right py-2 px-3 font-semibold">Filled</th><th className="text-center py-2 px-3 font-semibold">Status</th><th className="text-center py-2 px-3 font-semibold">Actions</th></tr>
          </thead>
          <tbody>
            {localOrders.map((order) => {
              const safePrice = Number(order.price ?? 0) || 0;
              return (
                <tr key={order.orderid} className={cn('border-b border-border hover:bg-muted/50 transition-colors', updating.has(order.orderid) && 'animate-pulse bg-yellow-50 dark:bg-yellow-950/20')}>
                  <td className="py-2 px-3 font-medium">{order.symbol}</td>
                  <td className="text-center py-2 px-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${order.action === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>{order.action}</span></td>
                  <td className="text-right py-2 px-3">{order.quantity}</td>
                  <td className="text-right py-2 px-3">₹{safePrice.toFixed(2)}</td>
                  <td className="text-right py-2 px-3">{order.filledQuantity}/{order.quantity}</td>
                  <td className="text-center py-2 px-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>{order.status}</span></td>
                  <td className="text-center py-2 px-3">{order.status === 'PENDING' && (<button onClick={() => handleCancelOrder(order.orderid)} className="text-xs px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded">Cancel</button>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
