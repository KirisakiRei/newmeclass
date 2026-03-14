// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings } from '../lib/site-settings';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SETTINGS_CACHE_KEY = 'app_settings_cache';
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const getSettingsFromCache = () => {
  try {
    const raw = sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < SETTINGS_CACHE_TTL) return data;
  } catch {}
  return null;
};

export const ThemeProvider = ({ children }) => {
  // Initialise from cache — synchronous, so theme is applied before first paint
  const [settings, setSettings] = useState(() => normalizeSiteSettings(getSettingsFromCache()));
  // loading is false by default: the app renders immediately with cached/default theme
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Apply cached theme immediately, then refetch in background to keep fresh
    if (settings) applyTheme(settings);
    else applyDefaultTheme();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/settings`);
      const normalizedSettings = normalizeSiteSettings(response.data);
      setSettings(normalizedSettings);
      applyTheme(normalizedSettings);
      // Cache result so next page load is instant
      sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ data: normalizedSettings, ts: Date.now() }));
    } catch (error) {
      console.error('Failed to load theme settings:', error);
      setSettings(DEFAULT_SITE_SETTINGS);
      applyDefaultTheme();
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (themeSettings) => {
    if (!themeSettings) return;

    // Apply CSS variables to root with !important
    const root = document.documentElement;
    
    if (themeSettings.primaryColor) {
      root.style.setProperty('--color-primary', themeSettings.primaryColor, 'important');
      // Also update Tailwind classes
      root.style.setProperty('--tw-ring-color', themeSettings.primaryColor, 'important');
    }
    if (themeSettings.secondaryColor) {
      root.style.setProperty('--color-secondary', themeSettings.secondaryColor, 'important');
    }
    if (themeSettings.accentColor) {
      root.style.setProperty('--color-accent', themeSettings.accentColor, 'important');
    }
    if (themeSettings.backgroundColor) {
      root.style.setProperty('--color-background', themeSettings.backgroundColor, 'important');
      document.body.style.backgroundColor = themeSettings.backgroundColor;
    }
    if (themeSettings.textColor) {
      root.style.setProperty('--color-text', themeSettings.textColor, 'important');
      document.body.style.color = themeSettings.textColor;
    }

    // Update favicon if provided
    if (themeSettings.faviconUrl) {
      updateFavicon(themeSettings.faviconUrl);
    }

    // Update page title
    if (themeSettings.siteTitle) {
      document.title = themeSettings.siteTitle;
    }
    
    console.log('Theme applied:', {
      primary: themeSettings.primaryColor,
      secondary: themeSettings.secondaryColor,
      background: themeSettings.backgroundColor
    });
  };

  const applyDefaultTheme = () => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', '#FFD700');
    root.style.setProperty('--color-secondary', '#1a1a1a');
    root.style.setProperty('--color-accent', '#2a2a2a');
    root.style.setProperty('--color-background', '#1a1a1a');
    root.style.setProperty('--color-text', '#ffffff');
  };

  const updateFavicon = (faviconUrl) => {
    // Remove existing favicons
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => link.remove());

    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl.startsWith('http') ? faviconUrl : `${BACKEND_URL}${faviconUrl}`;
    document.head.appendChild(link);

    // Also add apple-touch-icon
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = faviconUrl.startsWith('http') ? faviconUrl : `${BACKEND_URL}${faviconUrl}`;
    document.head.appendChild(appleLink);
  };

  const reloadSettings = async () => {
    await loadSettings();
  };

  return (
    <ThemeContext.Provider value={{ settings, loading, reloadSettings, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
