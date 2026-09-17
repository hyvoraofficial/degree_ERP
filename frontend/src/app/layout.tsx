import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { TenantProvider } from '@/providers/TenantProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { BranchProvider } from '@/providers/BranchProvider';

export const metadata: Metadata = {
  title: 'HYVORA EduERP - Degree College Management System',
  description: 'Enterprise Degree College Management & Academic ERP System for Engineering & Higher Education Institutions.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="min-h-full bg-background text-foreground antialiased flex flex-col">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <TenantProvider>
              <AuthProvider>
                <BranchProvider>
                  <ToastProvider>
                    {children}
                  </ToastProvider>
                </BranchProvider>
              </AuthProvider>
            </TenantProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
