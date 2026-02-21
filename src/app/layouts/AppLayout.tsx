import { ReactNode } from 'react';
import { LayoutDashboard, ClipboardList } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  currentPath: string;
}

const tabs = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/log', label: 'Log Data', icon: ClipboardList },
];

export function AppLayout({ children, currentPath }: AppLayoutProps) {
  return (
    <div className="min-h-screen pb-16">
      <main className="container mx-auto p-4">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {tabs.map(({ path, label, icon: Icon }) => {
            const isActive = currentPath === path;
            return (
              <a
                key={path}
                href={path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1">{label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
