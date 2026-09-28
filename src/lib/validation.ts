// ======== File validation constants ========

export const ALLOWED_AUDIO_MIMES = ['audio/mpeg'];
export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3'];
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export const MAX_PLAYLIST_NAME_LENGTH = 100;
export const MAX_SONG_TITLE_LENGTH = 200;

// ======== Validation functions ========

export function validateAudioFile(file: { name: string; type: string; size: number }): string | null {
  const ext = getFileExtension(file.name);
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    return `Invalid file type. Allowed: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`;
  }
  if (!ALLOWED_AUDIO_MIMES.includes(file.type) && file.type !== '') {
    return `Invalid MIME type "${file.type}". Allowed: ${ALLOWED_AUDIO_MIMES.join(', ')}`;
  }
  if (file.size > MAX_AUDIO_SIZE) {
    return `File too large. Maximum size: ${MAX_AUDIO_SIZE / 1024 / 1024} MB`;
  }
  if (file.size === 0) {
    return 'File is empty';
  }
  return null;
}

export function validateImageFile(file: { name: string; type: string; size: number }): string | null {
  const ext = getFileExtension(file.name);
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return `Invalid file type. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`;
  }
  if (!ALLOWED_IMAGE_MIMES.includes(file.type) && file.type !== '') {
    return `Invalid MIME type "${file.type}". Allowed: ${ALLOWED_IMAGE_MIMES.join(', ')}`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024} MB`;
  }
  if (file.size === 0) {
    return 'File is empty';
  }
  return null;
}

export function validatePlaylistName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Playlist name is required';
  }
  if (trimmed.length > MAX_PLAYLIST_NAME_LENGTH) {
    return `Playlist name must be ${MAX_PLAYLIST_NAME_LENGTH} characters or less`;
  }
  return null;
}

export function validateSongTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return 'Song title is required';
  }
  if (trimmed.length > MAX_SONG_TITLE_LENGTH) {
    return `Song title must be ${MAX_SONG_TITLE_LENGTH} characters or less`;
  }
  return null;
}

// ======== Helpers ========

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/** Extract a clean display title from a filename (strips extension and common junk) */
export function titleFromFilename(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot !== -1 ? filename.slice(0, lastDot) : filename;
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
