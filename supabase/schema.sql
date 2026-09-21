-- Run once in your own Supabase project's SQL editor.
create table if not exists public.songmap_records (
 owner_id uuid not null references auth.users(id) on delete cascade,
 entity_type text not null check (entity_type in ('projects','nodes','edges','tags','fragments','lyricsSections','lyricsLines','inboxItems','references')),
 record_id text not null,
 payload jsonb not null,
 version bigint not null default 1,
 mutation_id text not null,
 updated_at timestamptz not null default now(),
 primary key(owner_id,entity_type,record_id),
 check(payload->>'id'=record_id)
);
alter table public.songmap_records enable row level security;
drop policy if exists songmap_owner_read on public.songmap_records;
create policy songmap_owner_read on public.songmap_records for select to authenticated using ((select auth.uid())=owner_id);
revoke all on public.songmap_records from anon, authenticated;
grant select on public.songmap_records to authenticated;

create or replace function public.songmap_push(p_entity text,p_id text,p_payload jsonb,p_expected bigint,p_mutation text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); existing public.songmap_records; result public.songmap_records;
begin
 if uid is null then raise exception 'authentication required'; end if;
 if p_entity not in ('projects','nodes','edges','tags','fragments','lyricsSections','lyricsLines','inboxItems','references')
 or p_payload->>'id' is distinct from p_id or p_expected<0 or length(p_mutation)=0 then raise exception 'invalid mutation'; end if;
 -- Serialize even first insert, when no row yet exists.
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_entity||':'||p_id,0));
 select * into existing from public.songmap_records where owner_id=uid and entity_type=p_entity and record_id=p_id for update;
 if found then
  if existing.mutation_id=p_mutation then return jsonb_build_object('ok',true,'row',to_jsonb(existing)); end if;
  if existing.version<>p_expected then return jsonb_build_object('ok',false,'row',to_jsonb(existing)); end if;
  update public.songmap_records set payload=p_payload,version=existing.version+1,mutation_id=p_mutation,updated_at=now()
   where owner_id=uid and entity_type=p_entity and record_id=p_id returning * into result;
 else
  if p_expected<>0 then raise exception 'record missing'; end if;
  insert into public.songmap_records(owner_id,entity_type,record_id,payload,mutation_id)
   values(uid,p_entity,p_id,p_payload,p_mutation) returning * into result;
 end if;
 return jsonb_build_object('ok',true,'row',to_jsonb(result));
end $$;
revoke all on function public.songmap_push(text,text,jsonb,bigint,text) from public,anon;
grant execute on function public.songmap_push(text,text,jsonb,bigint,text) to authenticated;

