// ======== Database row types ========

export interface DbUser {
  id: string;
  email: string;
  created_at: string;
}

export interface DbPlaylist {
  id: string;
  user_id: string;
  name: string;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSong {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  duration: number | null;
  created_at: string;
}

export interface DbPlaylistSong {
  playlist_id: string;
  song_id: string;
  position: number;
  created_at: string;
}

// ======== API response types ========

export interface ApiPlaylist extends DbPlaylist {
  song_count?: number;
}

export interface ApiPlaylistSong extends DbSong {
  position: number;
}

// ======== Client-side types ========

/** A track that can be played — either a local file or a cloud-stored song */
export interface PlayableTrack {
  /** Unique identifier. For cloud songs, this is the DB id. For local files, a generated id. */
  id: string;
  title: string;
  /** The URL to play. Could be a blob URL or a cloud URL. */
  src: string;
  /** Whether this track is stored in the cloud */
  isCloud: boolean;
  /** Duration in seconds, if known */
  duration?: number;
}

export interface PlayerState {
  currentTrack: PlayableTrack | null;
  queue: PlayableTrack[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

// ======== Presigned upload types ========

export interface PresignRequest {
  filename: string;
  contentType: string;
  fileSize: number;
  type: 'song' | 'cover';
  playlistId?: string;
}

export interface PresignResponse {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}

// ======== Generic API response ========

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}
