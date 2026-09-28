-- ============================================================
-- Supabase SQL: Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ======== Playlists ========
create table playlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_playlists_user_id on playlists(user_id);

-- ======== Songs ========
create table songs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  original_filename text not null,
  storage_key text not null,
  mime_type text not null,
  file_size bigint not null,
  duration real,
  created_at timestamptz not null default now()
);

create index idx_songs_user_id on songs(user_id);

-- ======== Playlist Songs (join table) ========
create table playlist_songs (
  playlist_id uuid not null references playlists(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (playlist_id, song_id)
);

create index idx_playlist_songs_playlist_id on playlist_songs(playlist_id);
create index idx_playlist_songs_song_id on playlist_songs(song_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table playlists enable row level security;
alter table songs enable row level security;
alter table playlist_songs enable row level security;

-- Playlists: users can only access their own
create policy "Users can view own playlists"
  on playlists for select
  using (auth.uid() = user_id);

create policy "Users can create own playlists"
  on playlists for insert
  with check (auth.uid() = user_id);

create policy "Users can update own playlists"
  on playlists for update
  using (auth.uid() = user_id);

create policy "Users can delete own playlists"
  on playlists for delete
  using (auth.uid() = user_id);

-- Songs: users can only access their own
create policy "Users can view own songs"
  on songs for select
  using (auth.uid() = user_id);

create policy "Users can create own songs"
  on songs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own songs"
  on songs for delete
  using (auth.uid() = user_id);

-- Playlist Songs: users can manage through their playlists
create policy "Users can view playlist songs"
  on playlist_songs for select
  using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.user_id = auth.uid()
    )
  );

create policy "Users can add songs to own playlists"
  on playlist_songs for insert
  with check (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.user_id = auth.uid()
    )
  );

create policy "Users can update own playlist songs"
  on playlist_songs for update
  using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.user_id = auth.uid()
    )
  );

create policy "Users can remove songs from own playlists"
  on playlist_songs for delete
  using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.user_id = auth.uid()
    )
  );
