'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, FileCheck2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { session, loading, signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace('/dashboard');
  }, [session, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) toast.error(error);
      else toast.success('Signed in successfully');
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) toast.error(error);
      else toast.success('Account created. You can now sign in.');
      setMode('signin');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">DocuControl</span>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Document Control &amp; Compliance
          </h1>
          <p className="max-w-md text-primary-foreground/80 leading-relaxed">
            A clinical-grade system for managing scanned PDF documents, mandatory
            signatures, and expiration tracking — built for laboratory compliance teams.
          </p>
          <div className="space-y-3 pt-4">
            {[
              'Mandatory signature workflows',
              'Automated expiration & review alerts',
              'Role-based access for admins and signers',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-primary-foreground/90">
                <FileCheck2 className="h-5 w-5 text-accent" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} DocuControl. ISO 17025-aligned document management.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <Card className="w-full max-w-md border-border/60 shadow-xl animate-fade-in">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </CardTitle>
            <CardDescription>
              {mode === 'signin'
                ? 'Enter your credentials to access the compliance dashboard.'
                : 'Register to join the document control system.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@lab.org"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || loading}>
                {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === 'signin' ? (
                <>
                  Need an account?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="font-medium text-accent hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    onClick={() => setMode('signin')}
                    className="font-medium text-accent hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Secured by Supabase Auth
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
