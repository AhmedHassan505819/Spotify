'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import type { DbPlaylist, ApiPlaylistSong, PlayableTrack } from '@/types';
import { validateAudioFile, validateImageFile, titleFromFilename } from '@/lib/validation';

interface PlaylistViewProps {
  playlist: DbPlaylist;
  songs: ApiPlaylistSong[];
  onBack: () => void;
  onSongsChange: () => void;
  onPlaylistUpdate: (updated: DbPlaylist) => void;
  onPlaylistDelete: () => void;
}

interface LocalSong {
  id: string;
  file: File;
  title: string;
  duration: number | null;
  src: string;
}

export default function PlaylistView({
  playlist,
  songs,
  onBack,
  onSongsChange,
  onPlaylistUpdate,
  onPlaylistDelete,
}: PlaylistViewProps) {
  const { user } = useAuth();
  const { currentTrack, play } = useAudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [localSongs, setLocalSongs] = useState<LocalSong[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playlist.name);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      localSongs.forEach(song => {
        URL.revokeObjectURL(song.src);
      });
    };
  }, [localSongs]);

  // ======== Play a song ========
  const handlePlay = (index: number) => {
    const cloudTracks: PlayableTrack[] = songs.map((s) => ({
      id: s.id,
      title: s.title,
      src: getPublicUrl(s.storage_key),
      isCloud: true,
      duration: s.duration ?? undefined,
    }));
    
    const localTracks: PlayableTrack[] = localSongs.map(s => ({
      id: s.id,
      title: s.title,
      src: s.src,
      isCloud: false,
      duration: s.duration ?? undefined,
    }));

    const queue = [...cloudTracks, ...localTracks];
    play(queue[index], queue, index);
  };

  // ======== Local File Selection ========
  const handleAddSongs = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newLocalSongs: LocalSong[] = [];
    
    for (const file of Array.from(files)) {
      const validationError = validateAudioFile({ name: file.name, type: file.type, size: file.size });
      if (validationError) {
        setUploadStatus(`Skipped ${file.name}: ${validationError}`);
        setTimeout(() => setUploadStatus(''), 3000);
        continue;
      }
      
      const duration = await getAudioDuration(file);
      const src = URL.createObjectURL(file);
      
      newLocalSongs.push({
        id: `local-${Date.now()}-${Math.random()}`,
        file,
        title: titleFromFilename(file.name),
        duration,
        src
      });
    }

    setLocalSongs(prev => [...prev, ...newLocalSongs]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ======== Explicit Upload to Cloud ========
  const handleUploadLocal = async (localSong: LocalSong) => {
    setUploading(true);
    setUploadStatus(`Uploading ${localSong.file.name}...`);
    
    try {
      // 1. Get presigned URL
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: localSong.file.name,
          contentType: localSong.file.type || 'audio/mpeg',
          fileSize: localSong.file.size,
          type: 'song',
          playlistId: playlist.id,
        }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }
      const { uploadUrl, objectKey, publicUrl } = await presignRes.json();

      // 2. Upload directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: localSong.file,
        headers: { 'Content-Type': localSong.file.type || 'audio/mpeg' },
      });
      if (!uploadRes.ok) throw new Error('Upload to R2 failed');

      // 3. Save song metadata
      const songRes = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: localSong.title,
          originalFilename: localSong.file.name,
          storageKey: objectKey,
          mimeType: localSong.file.type || 'audio/mpeg',
          fileSize: localSong.file.size,
          duration: localSong.duration,
          playlistId: playlist.id,
        }),
      });
      if (!songRes.ok) {
        const err = await songRes.json();
        throw new Error(err.error || 'Failed to save song');
      }

      // Success: revoke URL, remove from local list, refresh cloud songs
      URL.revokeObjectURL(localSong.src);
      setLocalSongs(prev => prev.filter(s => s.id !== localSong.id));
      onSongsChange();
      setUploadStatus('');
    } catch (err) {
      setUploadStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setUploadStatus(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLocal = (id: string, src: string) => {
    URL.revokeObjectURL(src);
    setLocalSongs(prev => prev.filter(s => s.id !== id));
  };

  // ======== Upload cover ========
  const handleCoverClick = () => {
    coverInputRef.current?.click();
  };

  const handleCoverSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile({ name: file.name, type: file.type, size: file.size });
    if (validationError) {
      setUploadStatus(validationError);
      setTimeout(() => setUploadStatus(''), 3000);
      return;
    }

    try {
      setUploadStatus('Uploading cover...');

      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          type: 'cover',
          playlistId: playlist.id,
        }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }
      const { uploadUrl, publicUrl } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) throw new Error('Upload failed');

      // Update playlist cover URL with a timestamp to bust the browser cache
      const timestampedUrl = `${publicUrl}?t=${Date.now()}`;
      const patchRes = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_url: timestampedUrl }),
      });
      if (!patchRes.ok) throw new Error('Failed to update playlist');

      const { data } = await patchRes.json();
      onPlaylistUpdate(data);
      setUploadStatus('');
    } catch (err) {
      setUploadStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setUploadStatus(''), 3000);
    }

    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // ======== Remove song ========
  const handleRemoveSong = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/playlists/${playlist.id}/songs/${songId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove song');
      onSongsChange();
    } catch (err) {
      console.error(err);
    }
  };

  // ======== Rename playlist ========
  const handleNameSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === playlist.name) {
      setEditingName(false);
      setNameInput(playlist.name);
      return;
    }
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const { data } = await res.json();
        onPlaylistUpdate(data);
      }
    } catch (err) {
      console.error(err);
    }
    setEditingName(false);
  };

  // ======== Delete playlist ========
  const handleDeletePlaylist = async () => {
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, { method: 'DELETE' });
      if (res.ok) onPlaylistDelete();
    } catch (err) {
      console.error(err);
    }
  };

  // ======== Drag reorder ========
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDragEnd = async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      // Note: Reordering currently only supports cloud songs
      if (dragIndex >= songs.length || dragOverIndex >= songs.length) {
         setDragIndex(null);
         setDragOverIndex(null);
         return;
      }
      
      const newOrder = [...songs];
      const [moved] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dragOverIndex, 0, moved);
      const songIds = newOrder.map((s) => s.id);

      try {
        await fetch(`/api/playlists/${playlist.id}/songs/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songIds }),
        });
        onSongsChange();
      } catch (err) {
        console.error(err);
      }
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      <nav>
        <button className="back-btn" onClick={onBack}>← Back</button>
      </nav>

      <div className="playlist-header">
        <div className="playlist-cover" onClick={handleCoverClick}>
          {playlist.cover_url ? (
            <img src={playlist.cover_url} alt={playlist.name} />
          ) : (
            <div className="playlist-cover-placeholder">Click to add cover</div>
          )}
        </div>
        <div className="playlist-info">
          {editingName ? (
            <input
              className="modal-input"
              style={{ fontSize: '18px', fontWeight: 600, padding: '4px 6px', marginBottom: 0 }}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditingName(false); setNameInput(playlist.name); } }}
              autoFocus
            />
          ) : (
            <div className="playlist-title" onDoubleClick={() => setEditingName(true)}>
              {playlist.name}
            </div>
          )}
          <div className="playlist-meta">{songs.length + localSongs.length} song{songs.length + localSongs.length !== 1 ? 's' : ''}</div>
          <div className="playlist-actions">
            {!showDeleteConfirm ? (
              <button
                className="modal-btn modal-btn-secondary"
                style={{ fontSize: '10px', padding: '4px 10px' }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete playlist
              </button>
            ) : (
              <>
                <span className="delete-confirm">Delete this playlist?</span>
                <button
                  className="modal-btn modal-btn-primary"
                  style={{ fontSize: '10px', padding: '4px 10px' }}
                  onClick={handleDeletePlaylist}
                >
                  Yes
                </button>
                <button
                  className="modal-btn modal-btn-secondary"
                  style={{ fontSize: '10px', padding: '4px 10px' }}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  No
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {uploadStatus && <div className="upload-indicator" style={{ padding: '0 20px' }}>{uploadStatus}</div>}

      <div className="song-list">
        {/* Cloud Songs */}
        {songs.map((song, index) => (
          <div
            key={song.id}
            className={`song-row ${currentTrack?.id === song.id ? 'active' : ''} ${dragIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
            onClick={() => handlePlay(index)}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="song-row-left">
              <span className="drag-handle">⠿</span>
              <span className="song-row-number">{index + 1}</span>
              <span className="song-row-title">{song.title}</span>
            </div>
            <div className="song-row-actions">
              <span className="song-row-duration">
                {song.duration ? formatDuration(song.duration) : '--:--'}
              </span>
              <button
                className="song-remove-btn"
                onClick={(e) => handleRemoveSong(e, song.id)}
                title="Remove from playlist"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {/* Local Songs (pending upload) */}
        {localSongs.map((song, index) => (
          <div
            key={song.id}
            className={`song-row ${currentTrack?.id === song.id ? 'active' : ''}`}
            onClick={() => handlePlay(songs.length + index)}
          >
            <div className="song-row-left">
              <span className="song-row-number" style={{ color: '#4CAF50', fontSize: '10px' }}>Local</span>
              <span className="song-row-title">{song.title}</span>
            </div>
            <div className="song-row-actions">
               <button
                className="modal-btn modal-btn-secondary"
                style={{ fontSize: '9px', padding: '2px 6px' }}
                onClick={(e) => { e.stopPropagation(); handleUploadLocal(song); }}
                disabled={uploading}
              >
                Upload to Cloud
              </button>
              <span className="song-row-duration">
                {song.duration ? formatDuration(song.duration) : '--:--'}
              </span>
              <button
                className="song-remove-btn"
                onClick={(e) => { e.stopPropagation(); handleRemoveLocal(song.id, song.src); }}
                title="Remove from queue"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        <button className="add-song-btn" onClick={handleAddSongs} disabled={uploading}>
          <span>+</span> Select Local Files
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,audio/mpeg"
        multiple
        className="hidden-input"
        onChange={handleFilesSelected}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
        className="hidden-input"
        onChange={handleCoverSelected}
      />
    </>
  );
}

// ======== Helpers ========

function getPublicUrl(storageKey: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
  return `${base.replace(/\/$/, '')}/${storageKey}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const duration = isFinite(audio.duration) ? audio.duration : null;
      URL.revokeObjectURL(url);
      resolve(duration);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });
    audio.src = url;
  });
}
