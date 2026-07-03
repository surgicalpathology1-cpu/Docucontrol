/*
# Allow users to insert their own alerts

## Changes
- The alerts_insert policy was admin-only, which blocked the auto-seed flow where
  the app creates "signature_required" alerts for the current user on login.
- Changed to allow any authenticated user to insert alerts scoped to themselves
  (user_id = auth.uid()), so the app can self-generate per-user alerts.
*/

DROP POLICY IF EXISTS "alerts_insert_admin" ON public.alerts;
CREATE POLICY "alerts_insert_own"
ON public.alerts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
