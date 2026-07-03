'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useDashboardData } from '@/components/dashboard/use-dashboard-data';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { AlertsSection } from '@/components/dashboard/alerts-section';
import { DocumentsTable } from '@/components/dashboard/documents-table';
import { AdminStats } from '@/components/dashboard/admin-stats';
import { Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Document } from '@/lib/types';

type Tab = 'overview' | 'alerts' | 'documents';

export type DocFilter = 'all' | 'expired' | 'pending_signature' | 'under_review';

const filterLabels: Record<DocFilter, string> = {
  all: 'All Documents',
  expired: 'Expired Documents',
  pending_signature: 'Pending Signatures',
  under_review: 'Under Review',
};

export function DashboardShell() {
  const { profile, signOut } = useAuth();
  const { documents, mySignatures, allSignatures, myAlerts, requiredSigners, loading, refresh } = useDashboardData();
  const [tab, setTab] = useState<Tab>('overview');
  const [filter, setFilter] = useState<DocFilter>('all');
  const isAdmin = profile?.role === 'admin';

  const unreadAlerts = myAlerts.filter((a) => !a.is_read).length;

  const handleCardClick = useCallback((newFilter: DocFilter) => {
    setFilter(newFilter);
    setTab('documents');
  }, []);

  const handleAlertsClick = useCallback(() => {
    setTab('alerts');
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilter('all');
    setTab('overview');
  }, []);

  const showBreadcrumb = tab === 'documents' && filter !== 'all';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar profile={profile} activeTab={tab} onTabChange={setTab} unreadAlerts={unreadAlerts} />
      <div className="flex flex-1 flex-col lg:pl-0">
        <Header profile={profile} onSignOut={signOut} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
              {/* Breadcrumb / back button when filtered from stat card */}
              {showBreadcrumb && (
                <div className="flex items-center gap-2 text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilter}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back to Overview
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  <span className="font-medium text-foreground">{filterLabels[filter]}</span>
                </div>
              )}

              {/* Page heading */}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {tab === 'overview' && 'Compliance Overview'}
                  {tab === 'alerts' && 'Action Alerts'}
                  {tab === 'documents' && 'Document Library'}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab === 'overview' && 'Your document control dashboard at a glance.'}
                  {tab === 'alerts' && 'Documents requiring your attention and signature.'}
                  {tab === 'documents' && 'All controlled documents with signature status.'}
                </p>
              </div>

              {tab === 'overview' && (
                <>
                  {isAdmin && <AdminStats documents={documents} signatures={allSignatures} onCardClick={handleCardClick} />}
                  <AlertsSection alerts={myAlerts} documents={documents} onRefresh={refresh} compact onAlertsMoreClick={handleAlertsClick} />
                  <DocumentsTable
                    documents={documents}
                    mySignatures={mySignatures}
                    requiredSigners={requiredSigners}
                    onRefresh={refresh}
                    compact
                  />
                </>
              )}

              {tab === 'alerts' && (
                <AlertsSection alerts={myAlerts} documents={documents} onRefresh={refresh} />
              )}

              {tab === 'documents' && (
                <DocumentsTable
                  documents={documents}
                  mySignatures={mySignatures}
                  requiredSigners={requiredSigners}
                  onRefresh={refresh}
                  filter={filter}
                  onClearFilter={handleClearFilter}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
