'use client';

import { LayoutDashboard, ClipboardList, Dumbbell } from 'lucide-react';
import { link } from '@/app/shared/links';

const tabs: Array<{ path: '/' | '/log' | '/coach'; label: string; icon: React.ElementType }> = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/log', label: 'Log Data', icon: ClipboardList },
    { path: '/coach', label: 'Coach', icon: Dumbbell },
];

export function AppTabBar({ currentPath }: { currentPath: string }) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {tabs.map(({ path, label, icon: Icon }) => {
                    const isActive = currentPath === path;
                    return (
                        <a
                            key={path}
                            href={path === '/coach' ? '/coach' : link(path as '/' | '/log')}
                            onClick={(e) => {
                                if (path === '/coach') {
                                    e.preventDefault();
                                    window.location.href = '/coach';
                                }
                            }}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
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
    );
}
