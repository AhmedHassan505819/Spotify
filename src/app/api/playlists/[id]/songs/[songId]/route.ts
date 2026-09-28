import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { removeSongFromPlaylist } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string; songId: string }>;
}

// DELETE /api/playlists/[id]/songs/[songId] — Remove a song from a playlist
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, songId } = await params;
    await removeSongFromPlaylist(id, songId, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/playlists/[id]/songs/[songId] error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
