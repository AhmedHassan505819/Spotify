'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { DbPlaylist } from '@/types';

interface AlbumGridProps {
  playlists: DbPlaylist[];
  loading: boolean;
  onPlaylistSelect: (id: string) => void;
  onCreatePlaylist: () => void;
}

export default function AlbumGrid({
  playlists,
  loading,
  onPlaylistSelect,
  onCreatePlaylist,
}: AlbumGridProps) {
  const { user } = useAuth();

  return (
    <>
      <nav>Your Playlists</nav>
      <div className="Album">
        {loading ? (
          <div className="loading-state">Loading playlists...</div>
        ) : !user ? (
          <div className="empty-state">Log in to create and manage your playlists.</div>
        ) : (
          <>
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="AlbumCard"
                onClick={() => onPlaylistSelect(pl.id)}
              >
                <div className="img">
                  {pl.cover_url ? (
                    <img width="130" src={pl.cover_url} alt={pl.name} />
                  ) : (
                    <div style={{
                      width: 130,
                      height: 130,
                      background: '#2a2a2a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 36 }}>♫</span>
                    </div>
                  )}
                </div>
                <div className="Aname">{pl.name}</div>
                <div className="description">Playlist</div>
                <div className="greenbtn">
                  <svg width="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="#4CAF50" />
                    <polygon points="40,35 65,50 40,65" fill="#000000" />
                  </svg>
                </div>
              </div>
            ))}

            {/* Create new playlist card */}
            <div className="AlbumCard new-playlist-card" onClick={onCreatePlaylist}>
              <div className="new-playlist-icon">+</div>
              <div className="new-playlist-label">New Playlist</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
