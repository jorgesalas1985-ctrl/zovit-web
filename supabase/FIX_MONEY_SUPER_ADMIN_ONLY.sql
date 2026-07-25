-- Dinero y estados de cuenta: solo super_admin (intranet), no RR.HH. ni role=admin genérico.

drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own" on public.wallets for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.intranet_role = 'super_admin'
  )
);

drop policy if exists "wallet_tx_select" on public.wallet_transactions;
create policy "wallet_tx_select" on public.wallet_transactions for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.intranet_role = 'super_admin'
  )
);

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments for select to authenticated using (
  client_id = auth.uid()
  or professional_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.intranet_role = 'super_admin'
  )
);

drop policy if exists "payment_events_select" on public.payment_events;
create policy "payment_events_select" on public.payment_events for select to authenticated using (
  exists (
    select 1 from public.payments pay
    where pay.id = payment_id
      and (
        pay.client_id = auth.uid()
        or pay.professional_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.intranet_role = 'super_admin'
        )
      )
  )
);

drop policy if exists "disputes_select" on public.payment_disputes;
create policy "disputes_select" on public.payment_disputes for select to authenticated using (
  opened_by = auth.uid()
  or exists (
    select 1 from public.payments pay
    where pay.id = payment_id
      and (pay.client_id = auth.uid() or pay.professional_id = auth.uid())
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.intranet_role = 'super_admin'
  )
);
