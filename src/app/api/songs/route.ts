import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { createSong, addSongToPlaylist } from '@/lib/db';
import { validateSongTitle } from '@/lib/validation';

// POST /api/songs — Save song metadata (after upload to R2 is complete)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, originalFilename, storageKey, mimeType, fileSize, duration, playlistId } = body;

    // Validate required fields
    if (!title || !originalFilename || !storageKey || !mimeType || !fileSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const titleError = validateSongTitle(title);
    if (titleError) {
      return NextResponse.json({ error: titleError }, { status: 400 });
    }

    // Verify the storage key belongs to this user
    if (!storageKey.startsWith(`users/${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid storage key' }, { status: 403 });
    }

    const song = await createSong({
      user_id: user.id,
      title: title.trim(),
      original_filename: originalFilename,
      storage_key: storageKey,
      mime_type: mimeType,
      file_size: fileSize,
      duration: duration || null,
    });

    // If a playlistId is provided, add the song to that playlist
    if (playlistId && typeof playlistId === 'string') {
      try {
        await addSongToPlaylist(playlistId, song.id, user.id);
      } catch (err) {
        // Song was created but failed to add to playlist — not fatal
        console.error('Failed to add song to playlist:', err);
      }
    }

    return NextResponse.json({ data: song }, { status: 201 });
  } catch (err) {
    console.error('POST /api/songs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
