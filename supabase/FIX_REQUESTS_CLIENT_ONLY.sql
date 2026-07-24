-- Solo clientes (y admin) pueden publicar solicitudes de servicio.

drop policy if exists "requests_insert_client" on public.solicitudes_de_servicio;

create policy "requests_insert_client"
  on public.solicitudes_de_servicio
  for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('client', 'admin')
    )
  );
