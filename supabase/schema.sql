-- O Clandestino: schema e políticas de segurança para Supabase.
-- Execute no SQL Editor do projeto Supabase. Reexecutável para políticas/tabelas existentes.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  ingredients text not null default '',
  details text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_path text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists products_public_order_idx on public.products(is_available, sort_order, name);
create index if not exists products_category_idx on public.products(category_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

grant select on public.categories, public.products to anon, authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
grant select on public.admin_users to authenticated;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Public reads active categories" on public.categories;
drop policy if exists "Admins read all categories" on public.categories;
drop policy if exists "Admins insert categories" on public.categories;
drop policy if exists "Admins update categories" on public.categories;
drop policy if exists "Admins delete categories" on public.categories;
create policy "Public reads active categories" on public.categories for select to anon, authenticated using (is_active = true or (select public.is_admin()));
create policy "Admins insert categories" on public.categories for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update categories" on public.categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete categories" on public.categories for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Public reads available products" on public.products;
drop policy if exists "Admins insert products" on public.products;
drop policy if exists "Admins update products" on public.products;
drop policy if exists "Admins delete products" on public.products;
create policy "Public reads available products" on public.products for select to anon, authenticated using (
  (is_available = true and exists (select 1 from public.categories c where c.id = category_id and c.is_active = true))
  or (select public.is_admin())
);
create policy "Admins insert products" on public.products for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update products" on public.products for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete products" on public.products for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Admins can see own admin membership" on public.admin_users;
create policy "Admins can see own admin membership" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));

-- Bucket público para leitura das fotos; somente administradores podem enviar, alterar ou excluir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Anyone can view product images" on storage.objects;
drop policy if exists "Admins upload product images" on storage.objects;
drop policy if exists "Admins update product images" on storage.objects;
drop policy if exists "Admins delete product images" on storage.objects;
create policy "Anyone can view product images" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "Admins upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "Admins update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and (select public.is_admin())) with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "Admins delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and (select public.is_admin()));

-- SETUP ADMINISTRADOR (execute somente depois de criar o usuário em Authentication > Users):
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'SEU-EMAIL-AQUI'
-- on conflict (user_id) do nothing;

-- updated_at automático nos produtos.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();


-- ============================================================
-- Operação do restaurante: mesas, garçons, chamados e notificações.
-- Migração aditiva: preserva as categorias, produtos e administradores existentes.
-- ============================================================

alter table public.products add column if not exists video_path text;

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique check (number between 1 and 999),
  name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.waiter_calls (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.restaurant_tables(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'completed')),
  accepted_by uuid references public.staff_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

-- Campos adicionais para classificar e detalhar cada solicitação; seguros para bancos já existentes.
alter table public.waiter_calls add column if not exists service_type text not null default 'garcom';
alter table public.waiter_calls add column if not exists details text;
alter table public.waiter_calls drop constraint if exists waiter_calls_service_type_check;
alter table public.waiter_calls add constraint waiter_calls_service_type_check
  check (service_type in ('duvida', 'pedido', 'conta', 'garcom', 'talheres', 'outro'));

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.staff_users(user_id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists waiter_calls_status_created_idx on public.waiter_calls(status, created_at desc);
create index if not exists waiter_calls_table_status_idx on public.waiter_calls(table_id, status);
create index if not exists push_subscriptions_active_idx on public.push_subscriptions(is_active) where is_active = true;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid()) and s.is_active = true
  );
$$;
revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to anon, authenticated;

alter table public.restaurant_tables enable row level security;
alter table public.staff_users enable row level security;
alter table public.waiter_calls enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "Public reads active tables" on public.restaurant_tables;
create policy "Public reads active tables" on public.restaurant_tables
  for select to anon, authenticated using (is_active = true or (select public.is_admin()));

drop policy if exists "Admins manage tables" on public.restaurant_tables;
create policy "Admins manage tables" on public.restaurant_tables
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Staff and admins read staff" on public.staff_users;
create policy "Staff and admins read staff" on public.staff_users
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()) or (select public.is_active_staff()));

drop policy if exists "Admins manage staff" on public.staff_users;
create policy "Admins manage staff" on public.staff_users
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Staff and admins read calls" on public.waiter_calls;
create policy "Staff and admins read calls" on public.waiter_calls
  for select to authenticated using ((select public.is_admin()) or (select public.is_active_staff()));

drop policy if exists "Admins update calls" on public.waiter_calls;
create policy "Admins update calls" on public.waiter_calls
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Staff read own push subscriptions" on public.push_subscriptions;
create policy "Staff read own push subscriptions" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Staff insert own push subscriptions" on public.push_subscriptions;
create policy "Staff insert own push subscriptions" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_active_staff()));

drop policy if exists "Staff update own push subscriptions" on public.push_subscriptions;
create policy "Staff update own push subscriptions" on public.push_subscriptions
  for update to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Staff delete own push subscriptions" on public.push_subscriptions;
create policy "Staff delete own push subscriptions" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

grant select on public.restaurant_tables to anon, authenticated;
grant insert, update, delete on public.restaurant_tables to authenticated;
grant select on public.staff_users to authenticated;
grant insert, update, delete on public.staff_users to authenticated;
grant select, update on public.waiter_calls to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Clientes podem chamar a equipe sem criar conta. Uma mesa não pode gerar vários
-- chamados simultâneos enquanto o anterior estiver pendente ou em atendimento.
drop function if exists public.request_waiter(uuid);
create or replace function public.request_waiter(p_table_id uuid, p_service_type text default 'garcom', p_details text default null)
returns table(call_id uuid, table_number integer, already_open boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_call_id uuid;
  v_table_number integer;
begin
  select t.number into v_table_number
  from public.restaurant_tables t
  where t.id = p_table_id and t.is_active = true;

  if v_table_number is null then
    raise exception 'Mesa inválida ou inativa';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_table_id::text));

  select c.id into v_call_id
  from public.waiter_calls c
  where c.table_id = p_table_id and c.status in ('pending', 'accepted')
  order by c.created_at desc
  limit 1;

  if v_call_id is not null then
    return query select v_call_id, v_table_number, true;
    return;
  end if;

  insert into public.waiter_calls(table_id, status, service_type, details)
  values (
    p_table_id, 'pending',
    case when p_service_type in ('duvida', 'pedido', 'conta', 'garcom', 'talheres', 'outro') then p_service_type else 'garcom' end,
    nullif(left(trim(coalesce(p_details, '')), 250), '')
  )
  returning id into v_call_id;

  return query select v_call_id, v_table_number, false;
end;
$$;
revoke all on function public.request_waiter(uuid, text, text) from public;
grant execute on function public.request_waiter(uuid, text, text) to anon, authenticated;

-- A aceitação é atômica: dois garçons não conseguem assumir o mesmo chamado.
create or replace function public.claim_waiter_call(p_call_id uuid)
returns table(call_id uuid, accepted_by uuid, accepted_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_accepted_by uuid;
  v_accepted_at timestamptz;
begin
  if v_user_id is null or not exists (
    select 1 from public.staff_users s where s.user_id = v_user_id and s.is_active = true
  ) then
    raise exception 'Usuário não é um garçom ativo';
  end if;

  update public.waiter_calls c
  set status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  where c.id = p_call_id and c.status = 'pending'
  returning c.accepted_by, c.accepted_at into v_accepted_by, v_accepted_at;

  if v_accepted_by is null then
    raise exception 'Chamado já aceito ou encerrado';
  end if;

  return query select p_call_id, v_accepted_by, v_accepted_at;
end;
$$;
revoke all on function public.claim_waiter_call(uuid) from public;
grant execute on function public.claim_waiter_call(uuid) to authenticated;

-- Finalização restrita ao garçom que assumiu o chamado ou a um administrador.
create or replace function public.complete_waiter_call(p_call_id uuid)
returns table(call_id uuid, completed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_completed_at timestamptz;
begin
  if v_user_id is null then raise exception 'Login obrigatório'; end if;
  update public.waiter_calls c
  set status = 'completed', completed_at = now()
  where c.id = p_call_id and c.status = 'accepted'
    and (c.accepted_by = v_user_id or (select public.is_admin()))
  returning c.completed_at into v_completed_at;
  if v_completed_at is null then raise exception 'Call not assigned to this staff member or already completed'; end if;
  return query select p_call_id, v_completed_at;
end;
$$;
revoke all on function public.complete_waiter_call(uuid) from public;
grant execute on function public.complete_waiter_call(uuid) to authenticated;

-- Atualização de updated_at nas inscrições push.
drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

-- Permite atualizações em tempo real na tela dos garçons (reexecutável).
do $$
begin
  alter publication supabase_realtime add table public.waiter_calls;
exception when duplicate_object then
  null;
when undefined_object then
  null;
end $$;

-- Bucket público para vídeos curtos dos produtos; gravação apenas por administradores.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-videos', 'product-videos', true, 31457280, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 31457280, allowed_mime_types = array['video/mp4','video/webm','video/quicktime'];

drop policy if exists "Anyone can view product videos" on storage.objects;
drop policy if exists "Admins upload product videos" on storage.objects;
drop policy if exists "Admins update product videos" on storage.objects;
drop policy if exists "Admins delete product videos" on storage.objects;
create policy "Anyone can view product videos" on storage.objects for select to anon, authenticated using (bucket_id = 'product-videos');
create policy "Admins upload product videos" on storage.objects for insert to authenticated with check (bucket_id = 'product-videos' and (select public.is_admin()));
create policy "Admins update product videos" on storage.objects for update to authenticated using (bucket_id = 'product-videos' and (select public.is_admin())) with check (bucket_id = 'product-videos' and (select public.is_admin()));
create policy "Admins delete product videos" on storage.objects for delete to authenticated using (bucket_id = 'product-videos' and (select public.is_admin()));
