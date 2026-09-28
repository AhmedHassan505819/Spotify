import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { getPlaylistSongs, addSongToPlaylist } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/playlists/[id]/songs — List songs in a playlist
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const songs = await getPlaylistSongs(id, user.id);
    return NextResponse.json({ data: songs });
  } catch (err) {
    console.error('GET /api/playlists/[id]/songs error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/playlists/[id]/songs — Add an existing song to a playlist
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { songId } = body;

    if (!songId || typeof songId !== 'string') {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    await addSongToPlaylist(id, songId, user.id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/playlists/[id]/songs error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('already') ? 409 : message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
