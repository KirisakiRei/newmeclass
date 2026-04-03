// @ts-nocheck
import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const BACKEND_URL = String(process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const buildAssetUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') && BACKEND_URL ? `${BACKEND_URL}${value}` : value;
};

const sanitizeAnalyticsId = (value) => {
  const normalized = String(value || '').trim();
  return /^[A-Za-z0-9_-]{3,64}$/.test(normalized) ? normalized : '';
};

const SEOHead = () => {
  const { settings } = useTheme();

  useEffect(() => {
    if (!settings) return;

    const title = settings.siteTitle || settings.siteName || 'NEWME CLASS';
    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    const description = settings.seoMetaDescription || settings.siteDescription || '';
    metaDesc.content = description;

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = settings.seoKeywords || '';

    const faviconUrl = buildAssetUrl(settings.faviconUrl);
    if (faviconUrl) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = faviconUrl;

      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.href = faviconUrl;
    }

    const ogImageUrl = buildAssetUrl(settings.logoUrl || settings.faviconUrl);
    const metaDefinitions = [
      { selector: 'meta[property="og:title"]', attribute: 'property', name: 'og:title', content: title },
      { selector: 'meta[property="og:description"]', attribute: 'property', name: 'og:description', content: description },
      { selector: 'meta[property="og:image"]', attribute: 'property', name: 'og:image', content: ogImageUrl || '' },
      { selector: 'meta[name="theme-color"]', attribute: 'name', name: 'theme-color', content: settings.primaryColor || '#1a1a1a' },
    ];

    metaDefinitions.forEach((definition) => {
      let element = document.querySelector(definition.selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(definition.attribute, definition.name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', definition.content || '');
    });

    const gaId = sanitizeAnalyticsId(settings.googleAnalyticsId);
    if (gaId) {
      if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`)) {
        const gtagScript = document.createElement('script');
        gtagScript.async = true;
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(gtagScript);

        const gtagInit = document.createElement('script');
        gtagInit.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
        document.head.appendChild(gtagInit);
      }
    }

    const fbId = sanitizeAnalyticsId(settings.facebookPixelId);
    if (fbId) {
      if (!document.querySelector('script[data-fb-pixel]')) {
        const fbScript = document.createElement('script');
        fbScript.setAttribute('data-fb-pixel', 'true');
        fbScript.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbId}');fbq('track','PageView');`;
        document.head.appendChild(fbScript);
      }
    }

    if (settings.primaryColor) document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    if (settings.secondaryColor) document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
    if (settings.backgroundColor) document.documentElement.style.setProperty('--background-color', settings.backgroundColor);
  }, [settings]);

  return null;
};

export default SEOHead;

