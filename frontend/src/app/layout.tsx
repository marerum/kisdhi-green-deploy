import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/layout/Navigation'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { ToastProvider } from '@/providers/ToastProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import ConfigValidator from '@/components/common/ConfigValidator'
import ErrorBoundary from '@/components/common/ErrorBoundary'

export const metadata: Metadata = {
  title: 'AI Business Flow',
  description: 'Transform business process interviews into structured flow diagrams',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <ErrorBoundary>
          <ConfigValidator>
            <AuthProvider>
              <ToastProvider>
                <ErrorBoundary>
                  <Navigation />
                </ErrorBoundary>
                <ErrorBoundary>
                  <Breadcrumb />
                </ErrorBoundary>
                <main className="flex-1">
                  <ErrorBoundary showRetry={true}>
                    {children}
                  </ErrorBoundary>
                </main>
              </ToastProvider>
            </AuthProvider>
          </ConfigValidator>
        </ErrorBoundary>
      </body>
    </html>
  )
}