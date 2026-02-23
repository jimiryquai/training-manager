import { ReactNode } from 'react';
import { AppTabBar } from '@/app/components/ui/AppTabBar';

interface AppLayoutProps {
  children: ReactNode;
  currentPath: string;
}

export function AppLayout({ children, currentPath }: AppLayoutProps) {
  return (
    <div className="min-h-screen pb-16">
      <main className="container mx-auto p-4">
        {children}
      </main>
      <AppTabBar currentPath={currentPath} />
    </div>
  );
}
