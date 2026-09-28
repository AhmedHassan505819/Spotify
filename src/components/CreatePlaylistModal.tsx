'use client';

import React, { useState } from 'react';
import { validatePlaylistName } from '@/lib/validation';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export default function CreatePlaylistModal({ onClose, onCreate }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePlaylistName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onCreate(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
    }
    setLoading(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <h2>New Playlist</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="modal-error">{error}</div>}
          <input
            className="modal-input"
            type="text"
            placeholder="Playlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn modal-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-primary"
              disabled={loading || !name.trim()}
            >
              {loading ? '...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
