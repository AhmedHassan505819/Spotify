import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { getPlaylistById, updatePlaylist, deletePlaylist } from '@/lib/db';
import { validatePlaylistName } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/playlists/[id] — Get a single playlist
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const playlist = await getPlaylistById(id, user.id);
    if (!playlist) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: playlist });
  } catch (err) {
    console.error('GET /api/playlists/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/playlists/[id] — Update playlist name or cover
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, string> = {};

    if (body.name !== undefined) {
      const validationError = validatePlaylistName(body.name);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      updates.name = body.name.trim();
    }

    if (body.cover_url !== undefined) {
      updates.cover_url = body.cover_url;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const playlist = await updatePlaylist(id, user.id, updates);
    return NextResponse.json({ data: playlist });
  } catch (err) {
    console.error('PATCH /api/playlists/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/playlists/[id] — Delete a playlist
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deletePlaylist(id, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/playlists/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
