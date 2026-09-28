'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleLogIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  return (
    <>
      <nav>
        <div className="logo">
          <svg width="210" className="invert" role="img" viewBox="0 0 24 24"
            aria-label="Spotify" aria-hidden="false" height="32"
            data-encore-id="logoSpotify" style={{ '--encore-logo-fill-color': 'var(--decorative-base)' } as React.CSSProperties}>
            <title>Spotify</title>
            <path
              d="M13.427.01C6.805-.253 1.224 4.902.961 11.524.698 18.147 5.853 23.728 12.476 23.99c6.622.263 12.203-4.892 12.466-11.514S20.049.272 13.427.01m5.066 17.579a.717.717 0 0 1-.977.268 14.4 14.4 0 0 0-5.138-1.747 14.4 14.4 0 0 0-5.42.263.717.717 0 0 1-.338-1.392c1.95-.474 3.955-.571 5.958-.29 2.003.282 3.903.928 5.647 1.92a.717.717 0 0 1 .268.978m1.577-3.15a.93.93 0 0 1-1.262.376 17.7 17.7 0 0 0-5.972-1.96 17.7 17.7 0 0 0-6.281.238.93.93 0 0 1-1.11-.71.93.93 0 0 1 .71-1.11 19.5 19.5 0 0 1 6.94-.262 19.5 19.5 0 0 1 6.599 2.165c.452.245.62.81.376 1.263m1.748-3.551a1.147 1.147 0 0 1-1.546.488 21.4 21.4 0 0 0-6.918-2.208 21.4 21.4 0 0 0-7.259.215 1.146 1.146 0 0 1-.456-2.246 23.7 23.7 0 0 1 8.034-.24 23.7 23.7 0 0 1 7.657 2.445c.561.292.78.984.488 1.546"
              transform="translate(-0.95,0)"></path>
          </svg>
        </div>
        <div className="cent">
          <div className="home">
            <svg width="20" className="invert" data-encore-id="icon" role="img" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M13.5 1.515a3 3 0 0 0-3 0L3 5.845a2 2 0 0 0-1 1.732V21a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6h4v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7.577a2 2 0 0 0-1-1.732z"></path>
            </svg>
          </div>
          <div className="search">
            <svg width="20" className="invert" data-encore-id="icon" role="img" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path>
            </svg>
          </div>
          <div className="bar"><input type="text" placeholder="Search" /></div>
        </div>
        <div className="headerbtn">
          {loading ? null : user ? (
            <div className="user-menu">
              <div className="user-avatar">{user.email?.[0]?.toUpperCase() || '?'}</div>
              <button className="logout-btn" onClick={signOut}>Log out</button>
            </div>
          ) : (
            <>
              <button className="sign" onClick={handleSignUp}>Sign Up</button>
              <button className="log" onClick={handleLogIn}>Log in</button>
            </>
          )}
        </div>
      </nav>

      {showAuthModal && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
}
