-- PROPUESTA: aún NO se ha aplicado en Supabase. Revisar y aprobar antes de correrla.
-- Rol "vendedor" para el cotizador de Brendell: cotiza solo lo suyo, lee catálogo y precios de lista,
-- con tope de descuento. No ve dashboard, costos, ajustes, prospectos ni cotizaciones de otros.
-- Los administradores actuales (2 filas) quedan como 'dueno': no cambia nada para ellos.
-- Aplicarla ANTES de publicar el código que la usa.

alter table admin_users add column if not exists rol text not null default 'dueno' check (rol in ('dueno', 'vendedor'));
alter table admin_users add column if not exists descuento_max_pct numeric not null default 10 check (descuento_max_pct between 0 and 100);

-- es_admin() ahora significa "dueño". Todo lo que hoy exige es_admin() sigue cerrado para el vendedor.
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from admin_users a where a.email = auth.email() and a.rol = 'dueno');
$$;

create or replace function public.es_vendedor() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from admin_users a where a.email = auth.email() and a.rol = 'vendedor');
$$;

-- Cotizaciones y partidas: las políticas "own" ya dejan ver y editar solo lo propio
-- (distribuidor_email = correo de quien inicia sesión). El vendedor entra por ahí; no hace falta cambiarlas.

-- Clientes del cotizador: cada vendedor ve y edita solo los que él creó.
alter table cotizacion_clientes add column if not exists creado_por text default auth.email();
create policy cotizacion_clientes_vendedor on cotizacion_clientes for all
  using (es_vendedor() and creado_por = auth.email())
  with check (es_vendedor() and creado_por = auth.email());

-- Datos de la empresa para el PDF (solo lectura).
create policy cotizacion_ajustes_vendedor_leer on cotizacion_ajustes for select using (es_vendedor());

-- Precios de lista y catálogos de descarga (solo lectura). Productos, telas, colores y configuraciones ya son de lectura pública.
create policy precios_vendedor_leer on producto_precios for select using (es_vendedor());
create policy catalogos_vendedor_leer on catalogos for select using (es_vendedor());

-- Tope de descuento por partida, también del lado de la base (la pantalla solo avisa).
create or replace function public.limitar_descuento_vendedor() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare tope numeric;
begin
  if es_vendedor() then
    select descuento_max_pct into tope from admin_users where email = auth.email();
    if coalesce(new.descuento_pct, 0) > coalesce(tope, 0) then
      raise exception 'Tu descuento máximo es de % %%. Pide autorización al dueño.', tope;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists cotizacion_items_tope_descuento on cotizacion_items;
create trigger cotizacion_items_tope_descuento before insert or update on cotizacion_items
  for each row execute function limitar_descuento_vendedor();

-- Dar de alta a una persona (después de crear su usuario en Supabase → Authentication → Users, con su propio correo):
--   insert into admin_users (email, rol, descuento_max_pct) values ('correo@ejemplo.com', 'vendedor', 10);
-- Cambiar su tope:   update admin_users set descuento_max_pct = 15 where email = 'correo@ejemplo.com';
-- Quitarle el acceso: delete from admin_users where email = 'correo@ejemplo.com';
