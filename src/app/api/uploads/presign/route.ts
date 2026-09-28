import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { generatePresignedUploadUrl, generateSongKey, generateCoverKey } from '@/lib/r2/storage';
import {
  validateAudioFile,
  validateImageFile,
  ALLOWED_AUDIO_MIMES,
  ALLOWED_IMAGE_MIMES,
  MAX_AUDIO_SIZE,
  MAX_IMAGE_SIZE,
} from '@/lib/validation';

// POST /api/uploads/presign — Generate a presigned URL for direct browser-to-R2 upload
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { filename, contentType, fileSize, type, playlistId } = body;

    // Basic validation
    if (!filename || !contentType || !fileSize || !type) {
      return NextResponse.json({ error: 'Missing required fields: filename, contentType, fileSize, type' }, { status: 400 });
    }

    if (type !== 'song' && type !== 'cover') {
      return NextResponse.json({ error: 'type must be "song" or "cover"' }, { status: 400 });
    }

    // File-type-specific validation
    if (type === 'song') {
      const error = validateAudioFile({ name: filename, type: contentType, size: fileSize });
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
    } else {
      const error = validateImageFile({ name: filename, type: contentType, size: fileSize });
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
    }

    // Generate storage key
    let objectKey: string;
    let maxSize: number;

    if (type === 'song') {
      objectKey = generateSongKey(user.id, playlistId || 'general');
      maxSize = MAX_AUDIO_SIZE;
    } else {
      if (!playlistId) {
        return NextResponse.json({ error: 'playlistId is required for cover uploads' }, { status: 400 });
      }
      const ext = filename.lastIndexOf('.') !== -1
        ? filename.slice(filename.lastIndexOf('.')).toLowerCase()
        : '.jpg';
      objectKey = generateCoverKey(user.id, playlistId, ext);
      maxSize = MAX_IMAGE_SIZE;
    }

    const { uploadUrl, publicUrl } = await generatePresignedUploadUrl(
      objectKey,
      contentType,
      fileSize
    );

    return NextResponse.json({
      uploadUrl,
      objectKey,
      publicUrl,
    });
  } catch (err) {
    console.error('POST /api/uploads/presign error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
