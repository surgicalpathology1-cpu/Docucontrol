'use client';

import { ShieldCheck, LayoutDashboard, Bell, FileText, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/lib/types';

interface SidebarProps {
  profile: Profile | null;
  activeTab: 'overview' | 'alerts' | 'documents';
  onTabChange: (tab: 'overview' | 'alerts' | 'documents') => void;
  unreadAlerts: number;
}

export function Sidebar({ profile, activeTab, onTabChange, unreadAlerts }: SidebarProps) {
  const navItems = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'alerts' as const, label: 'Alerts', icon: Bell, badge: unreadAlerts },
    { id: 'documents' as const, label: 'Documents', icon: FileText },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-foreground">DocuControl</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                    active ? 'bg-accent text-accent-foreground' : 'bg-accent/10 text-accent'
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {profile?.full_name || 'User'}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium capitalize text-accent">
              {profile?.role ?? 'viewer'}
            </span>
            {profile?.department && (
              <span className="text-xs text-muted-foreground">{profile.department}</span>
            )}
          </p>
        </div>
      </div>
    </aside>
  );
}
