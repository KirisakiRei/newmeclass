// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { certificatesAPI } from '../../services/api';
import OfficialCertificateRenderer from '../../components/certificates/OfficialCertificateRenderer';

export default function CertificatePdfRender() {
  const { certificateNumber } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await certificatesAPI.verify(String(certificateNumber || '').trim());
        if (!active) return;
        if (!response?.data?.valid) {
          setError('Sertifikat tidak ditemukan.');
          return;
        }
        setPayload(response.data);
      } catch {
        if (!active) return;
        setError('Sertifikat tidak dapat dimuat.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [certificateNumber]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-gray-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Menyiapkan sertifikat...</span>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-red-500">
        {error || 'Sertifikat tidak tersedia.'}
      </div>
    );
  }

  const template = payload.templateSnapshot && typeof payload.templateSnapshot === 'object'
    ? {
        ...payload.templateSnapshot,
        ...(payload.secondaryLogoUrl
          ? {
              secondaryLogoUrl: payload.secondaryLogoUrl,
              logoUrl: payload.secondaryLogoUrl,
            }
          : {}),
      }
    : {};

  return (
    <div className="m-0 flex items-start justify-start bg-white p-0">
      <OfficialCertificateRenderer
        template={template}
        personalityData={payload.personalityData}
        recipientName={payload.userName || 'Peserta NEWME'}
        certificateNumber={payload.certificateNumber}
        qrCodeDataUrl={payload.qrCodeDataUrl || ''}
        identityLabel="No. Sertifikat"
        identityValue={payload.certificateNumber}
        issuedAt={payload.issuedAt}
        certType={payload.certType || 'individu'}
      />
    </div>
  );
}
