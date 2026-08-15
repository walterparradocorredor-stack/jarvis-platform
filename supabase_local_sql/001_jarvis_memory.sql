-- ============================================================================
-- 001_jarvis_memory.sql
-- Memoria RAG de JARVIS AI Platform — tabla vectorial + índice HNSW + RPC
-- Ejecutar contra el Postgres de Supabase self-hosted del VPS (supabase-db).
-- ============================================================================

create extension if not exists vector;

create table if not exists public.jarvis_memory (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  topic text,
  category text default 'rag',
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.jarvis_memory is 'Memoria vectorial RAG de JARVIS (embeddings Gemini/OpenAI, 1536 dimensiones).';

-- Índice vectorial HNSW para búsqueda por similitud coseno
create index if not exists jarvis_memory_embedding_hnsw_idx
  on public.jarvis_memory
  using hnsw (embedding vector_cosine_ops);

-- Índice auxiliar por categoría/tema para filtros rápidos
create index if not exists jarvis_memory_category_idx on public.jarvis_memory (category);

-- Trigger para mantener updated_at
create or replace function public.jarvis_memory_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_jarvis_memory_updated_at on public.jarvis_memory;
create trigger trg_jarvis_memory_updated_at
  before update on public.jarvis_memory
  for each row
  execute function public.jarvis_memory_set_updated_at();

-- RLS: habilitado, acceso vía rol de servicio / anon controlado por policies
alter table public.jarvis_memory enable row level security;

drop policy if exists "jarvis_memory_select_all" on public.jarvis_memory;
create policy "jarvis_memory_select_all"
  on public.jarvis_memory
  for select
  using (true);

drop policy if exists "jarvis_memory_service_write" on public.jarvis_memory;
create policy "jarvis_memory_service_write"
  on public.jarvis_memory
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- RPC: match_jarvis_memory — búsqueda por similitud coseno
create or replace function public.match_jarvis_memory(
  query_embedding vector(1536),
  match_threshold float default 0.75,
  match_count int default 8
)
returns table (
  id uuid,
  content text,
  topic text,
  category text,
  metadata jsonb,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  select
    jm.id,
    jm.content,
    jm.topic,
    jm.category,
    jm.metadata,
    1 - (jm.embedding <=> query_embedding) as similarity
  from public.jarvis_memory jm
  where jm.embedding is not null
    and 1 - (jm.embedding <=> query_embedding) > match_threshold
  order by jm.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_jarvis_memory(vector, float, int) to anon, authenticated, service_role;
