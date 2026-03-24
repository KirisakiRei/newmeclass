// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authAPI, clearAuthStorage } from '../../services/api';
import { buildPublicWebUrl } from '../../lib/app-urls';

const bridgeExchangeByTicket = new Map();

const getBridgeExchangePayload = (ticket) => {
  if (!bridgeExchangeByTicket.has(ticket)) {
    clearAuthStorage('user_token');
    const promise = authAPI.exchangeBridgeTicket(ticket)
      .then((response) => response?.data || response)
      .catch((error) => {
        bridgeExchangeByTicket.delete(ticket);
        throw error;
      });
    bridgeExchangeByTicket.set(ticket, promise);
  }

  return bridgeExchangeByTicket.get(ticket);
};

const AuthBridge = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const params = new URLSearchParams(location.search);
      const ticket = String(params.get('ticket') || '').trim();
      const target = String(params.get('target') || '/dashboard').trim() || '/dashboard';

      if (!ticket) {
        window.location.replace(buildPublicWebUrl('/login'));
        return;
      }

      try {
        const payload = await getBridgeExchangePayload(ticket);
        if (!active) return;
        const accessToken = payload?.token || payload?.access_token;
        const user = payload?.user || null;
        const resolvedTarget = String(payload?.target || target || '/dashboard').trim() || '/dashboard';
        if (!accessToken) {
          throw new Error('Bridge token tidak ditemukan');
        }
        localStorage.setItem('user_token', accessToken);
        if (user) {
          localStorage.setItem('user_data', JSON.stringify(user));
        }
        navigate(resolvedTarget.startsWith('/') ? resolvedTarget : `/${resolvedTarget}`, { replace: true });
      } catch (err) {
        clearAuthStorage('user_token');
        if (!active) return;
        setError('Sesi login tidak dapat diproses. Silakan masuk kembali.');
        window.setTimeout(() => window.location.replace(buildPublicWebUrl('/login')), 1200);
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
      <div className="rounded-2xl border border-yellow-400/20 bg-[#2a2a2a] px-8 py-6 text-center">
        <div className="flex items-center justify-center gap-3 text-white">
          <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
          Menyiapkan sesi Anda...
        </div>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
};

export default AuthBridge;
