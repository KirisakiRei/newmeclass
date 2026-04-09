// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import OfficialCertificateRenderer from './OfficialCertificateRenderer';

const CERTIFICATE_BASE_WIDTH = 1120;
const CERTIFICATE_BASE_HEIGHT = (CERTIFICATE_BASE_WIDTH * 210) / 297;

const normalizeCertType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'yayasan') return 'yayasan';
  if (normalized === 'individu') return 'individu';
  return '';
};

const readProfileExtra = (result) => {
  const extra = result?.user?.profile?.extra;
  return extra && typeof extra === 'object' && !Array.isArray(extra) ? extra : {};
};

const inferCertType = ({ certType, template, result }) => {
  const explicitType = normalizeCertType(certType);
  const templateType = normalizeCertType(template?.certType || result?.template?.certType);
  const profileExtra = readProfileExtra(result);
  const isYayasanLinked =
    result?.isYayasanLinked === true
    || profileExtra?.isYayasanLinked === true
    || String(result?.userRole || result?.user?.role || '').trim().toUpperCase() === 'YAYASAN'
    || String(result?.affiliationType || profileExtra?.affiliationType || '').trim().toLowerCase() === 'yayasan'
    || Boolean(
      result?.yayasanId
      || result?.yayasanName
      || result?.yayasanReferralCode
      || profileExtra?.yayasanId
      || profileExtra?.yayasanName
      || profileExtra?.yayasanReferralCode
      || profileExtra?.referralMeta?.yayasanId
      || profileExtra?.referralMeta?.yayasanCode
      || profileExtra?.referralMeta?.yayasanName
    );

  if (explicitType === 'yayasan' || templateType === 'yayasan' || isYayasanLinked) {
    return 'yayasan';
  }

  return explicitType || templateType || 'individu';
};

export default function ResultCertificate({
  template = {},
  result,
  resultId,
  certificateNumber,
  qrCodeDataUrl = '',
  issuedAt,
  certType = 'individu',
  identityLabel = 'ID',
  identityValue = '',
  lockPremiumSections = false,
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const resolvedTemplate = template && Object.keys(template).length ? template : (result?.template || {});
  const resolvedCertType = inferCertType({
    certType,
    template: resolvedTemplate,
    result,
  });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const updateScale = () => {
      const nextWidth = node.clientWidth || CERTIFICATE_BASE_WIDTH;
      const nextScale = Math.min(1, nextWidth / CERTIFICATE_BASE_WIDTH);
      setScale(nextScale > 0 ? nextScale : 1);
    };

    updateScale();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }

    const observer = new ResizeObserver(() => updateScale());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="relative mx-auto"
        style={{
          width: '100%',
          height: `${CERTIFICATE_BASE_HEIGHT * scale}px`,
        }}
      >
        <div
          style={{
            width: `${CERTIFICATE_BASE_WIDTH}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <OfficialCertificateRenderer
            template={resolvedTemplate}
            certType={resolvedCertType}
            recipientName={result?.userName || 'Peserta NEWME'}
            certificateNumber={certificateNumber || resultId || result?.resultId || result?.id}
            qrCodeDataUrl={qrCodeDataUrl}
            identityLabel={identityLabel}
            identityValue={identityValue}
            issuedAt={issuedAt || result?.createdAt}
            result={result}
            lockPremiumSections={lockPremiumSections}
          />
        </div>
      </div>
    </div>
  );
}
