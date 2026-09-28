import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { reorderPlaylistSongs } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/playlists/[id]/songs/reorder — Reorder songs in a playlist
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { songIds } = body;

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return NextResponse.json({ error: 'songIds array is required' }, { status: 400 });
    }

    await reorderPlaylistSongs(id, user.id, songIds);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/playlists/[id]/songs/reorder error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
