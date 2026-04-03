// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { adminAPI, authAPI, clearAuthStorage, mitraAPI, setSessionPresence, yayasanAPI } from '../../services/api';

const PROFILE_LOADERS = {
  admin_token: async () => adminAPI.getSession(),
  yayasan_token: async () => yayasanAPI.getSession(),
  mitra_token: async () => mitraAPI.getSession(),
  user_token: async () => authAPI.getSession(),
};

const ProtectedRoute = ({ tokenKey, redirectTo, children }) => {
  const location = useLocation();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const loader = PROFILE_LOADERS[tokenKey];
        if (!loader) {
          throw new Error('Profile loader not found');
        }
        const response = await loader();
        const payload = response?.data || response;
        if (!payload?.authenticated) {
          clearAuthStorage(tokenKey);
          if (active) setStatus('unauthorized');
          return;
        }
        setSessionPresence(tokenKey, true, payload?.viewer || null, payload?.session || null);
        if (active) setStatus('ready');
      } catch {
        clearAuthStorage(tokenKey);
        if (active) setStatus('unauthorized');
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [tokenKey]);

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status !== 'ready') {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
