import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/app/components/ui/sidebar';
import { CoachSidebar } from '../components/CoachSidebar';

interface CoachLayoutProps {
    children: ReactNode;
    currentPath: string;
}

export function CoachLayout({ children, currentPath }: CoachLayoutProps) {
    return (
        <SidebarProvider>
            <CoachSidebar currentPath={currentPath} />
            <main className="flex-1 min-w-0">
                <div className="flex h-16 items-center px-4 border-b md:hidden">
                    <SidebarTrigger />
                </div>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    );
}
