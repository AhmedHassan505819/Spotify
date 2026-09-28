import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { getUserPlaylists, createPlaylist } from '@/lib/db';
import { validatePlaylistName } from '@/lib/validation';

// GET /api/playlists — List user's playlists
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const playlists = await getUserPlaylists(user.id);
    return NextResponse.json({ data: playlists });
  } catch (err) {
    console.error('GET /api/playlists error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/playlists — Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    const validationError = validatePlaylistName(name || '');
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const playlist = await createPlaylist(user.id, name);
    return NextResponse.json({ data: playlist }, { status: 201 });
  } catch (err) {
    console.error('POST /api/playlists error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
