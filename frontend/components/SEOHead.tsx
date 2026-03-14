// @ts-nocheck
import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const SEOHead = () => {
  const { settings } = useTheme();

  useEffect(() => {
    if (!settings) return;

    if (settings.siteTitle) document.title = settings.siteTitle;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = settings.seoMetaDescription || settings.siteDescription || '';

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = settings.seoKeywords || '';

    if (settings.faviconUrl) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = settings.faviconUrl;
    }

    if (settings.googleAnalyticsId) {
      const gaId = settings.googleAnalyticsId;
      if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`)) {
        const gtagScript = document.createElement('script');
        gtagScript.async = true;
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(gtagScript);

        const gtagInit = document.createElement('script');
        gtagInit.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
        document.head.appendChild(gtagInit);
      }
    }

    if (settings.facebookPixelId) {
      const fbId = settings.facebookPixelId;
      if (!document.querySelector('script[data-fb-pixel]')) {
        const fbScript = document.createElement('script');
        fbScript.setAttribute('data-fb-pixel', 'true');
        fbScript.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbId}');fbq('track','PageView');`;
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

