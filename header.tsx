'use client';

import { ShieldCheck, LogOut, Bell, FileText, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Profile } from '@/lib/types';

interface HeaderProps {
  profile: Profile | null;
  onSignOut: () => void;
}

export function Header({ profile, onSignOut }: HeaderProps) {
  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <span className="font-semibold text-foreground">DocuControl</span>
      </div>

      <div className="hidden lg:block">
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight text-foreground">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs capitalize leading-tight text-muted-foreground">
              {profile?.role ?? 'viewer'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onSignOut} className="text-muted-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
