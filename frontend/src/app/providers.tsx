import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { useAlertStore } from '@/stores/alertStore'
import { MarketDataProvider } from '@/contexts/MarketDataContext'
import { Modal1CliqTradeContextProvider } from '@/features/1cliqtrade-frontend/contexts/Modal1CliqTradeContext'
import { WebSocketManagerProvider } from '@/features/1cliqtrade-frontend/contexts/WebSocketManagerContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const { position, maxVisibleToasts, duration } = useAlertStore()

  return (
    <QueryClientProvider client={queryClient}>
      <MarketDataProvider>
        <Modal1CliqTradeContextProvider>
          <WebSocketManagerProvider>
            {children}
          </WebSocketManagerProvider>
        </Modal1CliqTradeContextProvider>
      </MarketDataProvider>
      <Toaster
        position={position}
        richColors
        visibleToasts={maxVisibleToasts}
        duration={duration}
        closeButton
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
