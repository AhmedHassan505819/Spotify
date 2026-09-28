import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbPlaylist, DbSong, ApiPlaylistSong } from '@/types';

// ======== Playlists ========

export async function getUserPlaylists(userId: string): Promise<DbPlaylist[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch playlists: ${error.message}`);
  return data || [];
}

export async function getPlaylistById(playlistId: string, userId: string): Promise<DbPlaylist | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch playlist: ${error.message}`);
  }
  return data;
}

export async function createPlaylist(userId: string, name: string): Promise<DbPlaylist> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('playlists')
    .insert({ user_id: userId, name: name.trim() })
    .select()
    .single();

  if (error) throw new Error(`Failed to create playlist: ${error.message}`);
  return data;
}

export async function updatePlaylist(
  playlistId: string,
  userId: string,
  updates: Partial<Pick<DbPlaylist, 'name' | 'cover_url'>>
): Promise<DbPlaylist> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('playlists')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', playlistId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update playlist: ${error.message}`);
  return data;
}

export async function deletePlaylist(playlistId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // First remove all playlist_songs entries
  await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId);

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete playlist: ${error.message}`);
}

// ======== Songs ========

export async function createSong(songData: {
  user_id: string;
  title: string;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  duration: number | null;
}): Promise<DbSong> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('songs')
    .insert(songData)
    .select()
    .single();

  if (error) throw new Error(`Failed to create song: ${error.message}`);
  return data;
}

export async function getSongById(songId: string, userId: string): Promise<DbSong | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', songId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch song: ${error.message}`);
  }
  return data;
}

export async function deleteSong(songId: string, userId: string): Promise<DbSong | null> {
  const supabase = await createServerSupabaseClient();

  // Get song first to return storage_key for R2 cleanup
  const song = await getSongById(songId, userId);
  if (!song) return null;

  // Remove from all playlists
  await supabase
    .from('playlist_songs')
    .delete()
    .eq('song_id', songId);

  // Delete the song record
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', songId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete song: ${error.message}`);
  return song;
}

// ======== Playlist Songs (join table) ========

export async function getPlaylistSongs(playlistId: string, userId: string): Promise<ApiPlaylistSong[]> {
  const supabase = await createServerSupabaseClient();

  // First verify the playlist belongs to the user
  const playlist = await getPlaylistById(playlistId, userId);
  if (!playlist) throw new Error('Playlist not found');

  const { data, error } = await supabase
    .from('playlist_songs')
    .select('position, song_id, songs(*)')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });

  if (error) throw new Error(`Failed to fetch playlist songs: ${error.message}`);

  return (data || []).map((row) => {
    const song = row.songs as unknown as DbSong;
    return {
      ...song,
      position: row.position,
    };
  });
}

export async function addSongToPlaylist(playlistId: string, songId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Verify ownership
  const playlist = await getPlaylistById(playlistId, userId);
  if (!playlist) throw new Error('Playlist not found');

  const song = await getSongById(songId, userId);
  if (!song) throw new Error('Song not found');

  // Get the next position
  const { data: existing } = await supabase
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { error } = await supabase
    .from('playlist_songs')
    .insert({
      playlist_id: playlistId,
      song_id: songId,
      position: nextPosition,
    });

  if (error) {
    // Handle duplicate
    if (error.code === '23505') {
      throw new Error('Song is already in this playlist');
    }
    throw new Error(`Failed to add song to playlist: ${error.message}`);
  }
}

export async function removeSongFromPlaylist(playlistId: string, songId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Verify ownership
  const playlist = await getPlaylistById(playlistId, userId);
  if (!playlist) throw new Error('Playlist not found');

  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId);

  if (error) throw new Error(`Failed to remove song from playlist: ${error.message}`);
}

export async function reorderPlaylistSongs(
  playlistId: string,
  userId: string,
  songIds: string[]
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Verify ownership
  const playlist = await getPlaylistById(playlistId, userId);
  if (!playlist) throw new Error('Playlist not found');

  // Update positions in a loop (Supabase doesn't support batch upsert well here)
  for (let i = 0; i < songIds.length; i++) {
    const { error } = await supabase
      .from('playlist_songs')
      .update({ position: i })
      .eq('playlist_id', playlistId)
      .eq('song_id', songIds[i]);

    if (error) throw new Error(`Failed to reorder songs: ${error.message}`);
  }
}
