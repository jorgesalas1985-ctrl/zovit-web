-- Cierra IDOR: un usuario autenticado no puede consultar el wallet de otro.
create or replace function public.get_wallet_summary(p_user_id uuid default auth.uid())
returns table (
  available_balance numeric,
  held_balance numeric,
  currency text,
  total_received numeric,
  total_fees numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(auth.uid(), p_user_id);
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  -- Solo el propio usuario (o admin) puede leer un resumen de wallet.
  if p_user_id is distinct from auth.uid()
     and not exists (
       select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
     ) then
    raise exception 'Sin permiso para consultar este wallet';
  end if;

  v_user := p_user_id;

  return query
  select
    coalesce(w.available_balance, 0),
    coalesce(w.held_balance, 0),
    coalesce(w.currency, 'CLP'),
    coalesce((select sum(p.amount_net) from public.payments p where p.professional_id = v_user and p.status = 'pago_liberado'), 0),
    coalesce((select sum(p.platform_fee + p.tax_amount) from public.payments p where p.professional_id = v_user and p.status = 'pago_liberado'), 0)
  from public.wallets w
  where w.user_id = v_user;
end;
$$;

revoke execute on function public.get_wallet_summary(uuid) from anon, public;
grant execute on function public.get_wallet_summary(uuid) to authenticated, service_role;
