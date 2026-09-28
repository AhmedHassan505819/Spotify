'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import AlbumGrid from '@/components/AlbumGrid';
import PlaylistView from '@/components/PlaylistView';
import Playbar from '@/components/Playbar';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import type { DbPlaylist, ApiPlaylistSong } from '@/types';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  // Playlists state
  const [playlists, setPlaylists] = useState<DbPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  // Active playlist view
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<DbPlaylist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<ApiPlaylistSong[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ======== Fetch playlists ========
  const fetchPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      return;
    }
    setPlaylistsLoading(true);
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const { data } = await res.json();
        setPlaylists(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch playlists:', err);
    }
    setPlaylistsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // ======== Fetch playlist songs ========
  const fetchPlaylistSongs = useCallback(async (playlistId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`);
      if (res.ok) {
        const { data } = await res.json();
        setPlaylistSongs(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch playlist songs:', err);
    }
  }, []);

  // ======== Select playlist ========
  const handlePlaylistSelect = useCallback(async (id: string) => {
    setActivePlaylistId(id);
    const pl = playlists.find((p) => p.id === id);
    if (pl) setActivePlaylist(pl);
    await fetchPlaylistSongs(id);
  }, [playlists, fetchPlaylistSongs]);

  // ======== Back to grid ========
  const handleBack = () => {
    setActivePlaylistId(null);
    setActivePlaylist(null);
    setPlaylistSongs([]);
  };

  // ======== Create playlist ========
  const handleCreatePlaylist = async (name: string) => {
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create playlist');
    }
    await fetchPlaylists();
  };

  // ======== Playlist updated ========
  const handlePlaylistUpdate = (updated: DbPlaylist) => {
    setActivePlaylist(updated);
    setPlaylists((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  // ======== Playlist deleted ========
  const handlePlaylistDelete = () => {
    handleBack();
    fetchPlaylists();
  };

  return (
    <>
      <Navbar />
      <div className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        {mobileMenuOpen ? '✕' : '☰'}
      </div>
      <div className="main">
        <div className={`sidebar-wrapper ${mobileMenuOpen ? 'open' : ''}`}>
          <Sidebar
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            playlistSongs={playlistSongs}
            onPlaylistSelect={(id) => {
              handlePlaylistSelect(id);
              setMobileMenuOpen(false); // Close menu on select
            }}
            onCreatePlaylist={() => setShowCreateModal(true)}
          />
        </div>
        <div className="playlist">
          {activePlaylist && activePlaylistId ? (
            <PlaylistView
              key={activePlaylistId}
              playlist={activePlaylist}
              songs={playlistSongs}
              onBack={handleBack}
              onSongsChange={() => fetchPlaylistSongs(activePlaylistId)}
              onPlaylistUpdate={handlePlaylistUpdate}
              onPlaylistDelete={handlePlaylistDelete}
            />
          ) : (
            <AlbumGrid
              playlists={playlists}
              loading={authLoading || playlistsLoading}
              onPlaylistSelect={handlePlaylistSelect}
              onCreatePlaylist={() => setShowCreateModal(true)}
            />
          )}
          <Playbar />
        </div>
      </div>

      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePlaylist}
        />
      )}
    </>
  );
}
