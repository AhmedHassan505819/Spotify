import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { deleteSong } from '@/lib/db';
import { deleteObject } from '@/lib/r2/storage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/songs/[id] — Delete a song and its R2 object
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const song = await deleteSong(id, user.id);

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Clean up R2 object
    try {
      await deleteObject(song.storage_key);
    } catch (err) {
      console.error('Failed to delete R2 object:', err);
      // Don't fail the request — the DB record is already deleted
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/songs/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
