/**
 * OrderTable - Orders (OrderBook) tab component
 * Displays active and completed orders
 */

import { useState, useEffect } from 'react';
import { Order } from '../types/index';

/**
 * Orders tab - shows user's orders
 */
export function OrderTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch orders from API: /1cliqtrade/api/orderbook_tab
    // For now, set loading state
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading orders...</div>;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No orders
      </div>
    );
  }

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

  return (
    <div className="flex-1 overflow-y-auto">
      {/* TODO: Render orders table with modification UI */}
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2">Symbol</th>
              <th className="text-center py-2 px-2">Action</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">Price</th>
              <th className="text-right py-2 px-2">Filled</th>
              <th className="text-center py-2 px-2">Status</th>
              <th className="text-center py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderid} className="border-b border-border hover:bg-muted/50">
                <td className="py-2 px-2">{order.symbol}</td>
                <td className="text-center py-2 px-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${order.action === 'BUY'
                        ? 'text-green-600'
                        : 'text-red-600'
                      }`}
                  >
                    {order.action}
                  </span>
                </td>
                <td className="text-right py-2 px-2">{order.quantity}</td>
                <td className="text-right py-2 px-2">₹{order.price.toFixed(2)}</td>
                <td className="text-right py-2 px-2">
                  {order.filledQuantity}/{order.quantity}
                </td>
                <td className="text-center py-2 px-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="text-center py-2 px-2">
                  {order.status === 'PENDING' && (
                    <button className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded">
                      Modify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
