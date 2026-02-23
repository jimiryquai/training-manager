"use client";

import { Dumbbell, LayoutDashboard } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
} from "@/app/components/ui/sidebar";
import { link } from "@/app/shared/links";

const navItems = [
    { path: '/coach', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/coach/library', label: 'Exercise Library', icon: Dumbbell },
];

export function CoachSidebar({ currentPath }: { currentPath: string }) {
    return (
        <Sidebar>
            <SidebarHeader className="h-16 flex items-center flex-row px-6 border-b">
                <span className="text-lg font-bold">Coach Admin</span>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.label}>
                                    <SidebarMenuButton
                                        isActive={currentPath === item.path}
                                        render={
                                            <a href={link(item.path as any)}>
                                                <item.icon />
                                                <span>{item.label}</span>
                                            </a>
                                        }
                                    />
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
