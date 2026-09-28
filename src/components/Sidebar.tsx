'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import type { DbPlaylist, PlayableTrack, ApiPlaylistSong } from '@/types';

interface SidebarProps {
  playlists: DbPlaylist[];
  activePlaylistId: string | null;
  playlistSongs: ApiPlaylistSong[];
  onPlaylistSelect: (id: string) => void;
  onCreatePlaylist: () => void;
}

export default function Sidebar({
  playlists,
  activePlaylistId,
  playlistSongs,
  onPlaylistSelect,
  onCreatePlaylist,
}: SidebarProps) {
  const { user } = useAuth();
  const { currentTrack, play } = useAudio();

  const handleSongClick = (song: ApiPlaylistSong, index: number) => {
    const queue: PlayableTrack[] = playlistSongs.map((s) => ({
      id: s.id,
      title: s.title,
      src: s.storage_key ? getPublicUrl(s.storage_key) : '',
      isCloud: true,
      duration: s.duration ?? undefined,
    }));
    play(queue[index], queue, index);
  };

  return (
    <div className="library">
      <div className="first">
        <div className="header">Your Library</div>
        {user && (
          <div className="plus" onClick={onCreatePlaylist} style={{ cursor: 'pointer' }}>
            <svg width="20" className="invert" data-encore-id="icon" role="img" aria-hidden="true" viewBox="0 0 16 16">
              <path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75"></path>
            </svg>
          </div>
        )}
      </div>

      <div className="leftSongs">
        {!user ? (
          <div className="empty-state">Log in to see your playlists</div>
        ) : playlists.length === 0 ? (
          <div className="empty-state">No playlists yet. Click + to create one.</div>
        ) : (
          <>
            {/* Show playlists in sidebar */}
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className={`playlist-sidebar-card ${activePlaylistId === pl.id ? 'active' : ''}`}
                onClick={() => onPlaylistSelect(pl.id)}
              >
                <div className="playlist-sidebar-thumb">
                  {pl.cover_url ? (
                    <img src={pl.cover_url} alt="" />
                  ) : null}
                </div>
                <div className="playlist-sidebar-name">{pl.name}</div>
              </div>
            ))}

            {/* If a playlist is selected, show its songs below */}
            {activePlaylistId && playlistSongs.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid #3a3a3a', margin: '8px' }} />
                {playlistSongs.map((song, index) => (
                  <div
                    key={song.id}
                    className={`Songcard ${currentTrack?.id === song.id ? 'active' : ''}`}
                    onClick={() => handleSongClick(song, index)}
                  >
                    <div className="music">
                      <svg className="invert" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="#000000" fill="none">
                        <defs />
                        <path fill="#141B34" d="M10.25,13.04 L10.25,6.638 C10.25,4.595 10.25,3.831 10.68,3.34 C10.984,2.994 11.294,2.826 11.753,2.762 C12.392,2.67 13.068,3.097 15.075,4.365 L15.086,4.372 C16.632,5.35 18.837,6.258 20.568,5.038 C20.797,4.877 21.097,4.856 21.345,4.985 C21.594,5.114 21.75,5.371 21.75,5.651 C21.75,7.939 20.406,10.015 18.325,10.941 C17.459,11.327 16.621,11.301 15.686,10.861 C14.515,10.308 13.195,9.435 11.75,8.26 L11.75,16.501 C11.75,19.12 9.619,21.251 7,21.251 C4.381,21.251 2.25,19.12 2.25,16.501 C2.25,13.882 4.381,11.751 7,11.751 C8.256,11.751 9.4,12.241 10.25,13.04 Z M3.75,16.501 C3.75,18.293 5.208,19.751 7,19.751 C8.792,19.751 10.25,18.293 10.25,16.501 C10.25,14.709 8.792,13.251 7,13.251 C5.208,13.251 3.75,14.709 3.75,16.501 Z M11.751,6.3 C13.481,7.809 15.019,8.887 16.326,9.505 C16.863,9.758 17.253,9.777 17.715,9.571 C18.852,9.065 19.692,8.094 20.054,6.937 C18.392,7.431 16.427,6.995 14.284,5.64 L14.274,5.633 L14.258,5.623 C13.166,4.933 12.219,4.336 11.912,4.256 C11.882,4.262 11.871,4.266 11.87,4.267 C11.87,4.267 11.861,4.274 11.841,4.295 C11.761,4.539 11.752,5.368 11.751,6.3 Z" />
                      </svg>
                    </div>
                    <div className="Sname">{song.title}</div>
                    <div className="play">
                      <svg className="invert" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="#000000" fill="none">
                        <defs />
                        <path fill="#141B34" d="M13.852,6.287 L13.941,6.337 C15.573,7.265 16.857,7.994 17.771,8.662 C18.691,9.334 19.372,10.037 19.616,10.963 C19.795,11.643 19.795,12.357 19.616,13.037 C19.372,13.963 18.691,14.666 17.771,15.339 C16.857,16.006 15.573,16.735 13.941,17.663 L13.852,17.713 C12.275,18.61 11.033,19.315 10.023,19.744 C9.005,20.177 8.077,20.397 7.175,20.141 C6.513,19.953 5.909,19.597 5.424,19.107 C4.764,18.441 4.5,17.522 4.374,16.415 C4.25,15.317 4.25,13.879 4.25,12.05 L4.25,11.95 C4.25,10.121 4.25,8.683 4.374,7.585 C4.5,6.478 4.764,5.559 5.424,4.893 C5.909,4.403 6.513,4.047 7.175,3.859 C8.077,3.603 9.005,3.823 10.023,4.256 C11.033,4.685 12.275,5.391 13.852,6.287 Z M9.436,5.636 C8.514,5.244 7.984,5.189 7.584,5.302 C7.171,5.419 6.794,5.642 6.489,5.949 C6.192,6.249 5.979,6.747 5.865,7.753 C5.751,8.757 5.75,10.11 5.75,12 C5.75,13.89 5.751,15.243 5.865,16.247 C5.979,17.253 6.192,17.751 6.489,18.051 C6.794,18.358 7.171,18.581 7.584,18.698 C7.984,18.811 8.514,18.756 9.436,18.364 C10.357,17.972 11.524,17.311 13.155,16.384 C14.842,15.426 16.05,14.738 16.886,14.127 C17.724,13.515 18.056,13.072 18.165,12.655 C18.278,12.226 18.278,11.774 18.165,11.345 C18.056,10.929 17.724,10.485 16.886,9.873 C16.05,9.262 14.842,8.574 13.155,7.616 C11.524,6.689 10.357,6.028 9.436,5.636 Z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div className="footer">
        <a href="https://www.spotify.com/pk-en/legal/">Legal</a>
        <a href="https://www.spotify.com/pk-en/safetyandprivacy/">Safety & Privacy Center</a>
        <a href="https://www.spotify.com/pk-en/legal/privacy-policy/">Privacy Policy</a>
        <a href="https://www.spotify.com/pk-en/legal/cookies-policy/">Cookies</a>
        <a href="https://www.spotify.com/pk-en/legal/privacy-policy/#s3">About Ads</a>
        <a href="https://www.spotify.com/pk-en/accessibility/">Accessibility</a>
      </div>
    </div>
  );
}

function getPublicUrl(storageKey: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
  return `${base.replace(/\/$/, '')}/${storageKey}`;
}
