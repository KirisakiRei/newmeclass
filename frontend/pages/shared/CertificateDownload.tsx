// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { certificatesAPI, hasSessionPresence } from '../../services/api';
import ResultCertificate from '../../components/certificates/ResultCertificate';

const normalizeViewer = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['admin', 'yayasan', 'mitra', 'user'].includes(normalized)) return normalized;
  return '';
};

const resolveViewerContext = (value) => {
  const explicitViewer = normalizeViewer(value);
  if (explicitViewer) return explicitViewer;
  if (hasSessionPresence('yayasan_token')) return 'yayasan';
  if (hasSessionPresence('mitra_token')) return 'mitra';
  if (hasSessionPresence('admin_token')) return 'admin';
  return 'user';
};

const resolveBackLink = (viewer) => {
  if (viewer === 'yayasan') return '/yayasan/dashboard';
  if (viewer === 'mitra') return '/mitra/dashboard';
  if (viewer === 'admin') return '/admin/certificates';
  return '/dashboard';
};

export default function CertificateDownload() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const autoDownloadStartedRef = useRef(false);
  const certificateRef = useRef(null);
  const shouldAutoPrint = searchParams.get('download') === '1';
  const isEmbedded = searchParams.get('embed') === '1';
  const viewer = resolveViewerContext(searchParams.get('viewer'));
  const backLink = resolveBackLink(viewer);
  const isPremiumResult = payload?.result?.testType === 'paid';

  const savePdfBuffer = (data, fileName) => {
    const blob = new Blob([data], { type: 'application/pdf' });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 1000);
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await certificatesAPI.getPreviewData(userId);
        if (!active) return;
        setPayload(response.data || null);
      } catch (err) {
        if (!active) return;
        setError('Sertifikat belum bisa dimuat.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const handleDownloadPdf = async () => {
    if (!userId || !isPremiumResult || downloading) return;
    setDownloading(true);
    try {
      const response = await certificatesAPI.generateMyCertificate(userId);
      savePdfBuffer(
        response.data,
        `${payload?.certificateNumber || `certificate-${userId}`}.pdf`,
      );
    } catch {
      setError('PDF sertifikat gagal diunduh. Silakan coba lagi.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (isEmbedded || !shouldAutoPrint || loading || !payload || !isPremiumResult || autoDownloadStartedRef.current) {
      return;
    }

    autoDownloadStartedRef.current = true;
    void handleDownloadPdf();
  }, [isEmbedded, shouldAutoPrint, loading, payload, isPremiumResult]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Menyiapkan sertifikat...</span>
        </div>
      </div>
    );
  }

  if (error || !payload?.result) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-500">{error || 'Data sertifikat tidak tersedia.'}</p>
        <Link to={backLink} className="text-yellow-600 underline">Kembali</Link>
      </div>
    );
  }

  const resolvedTemplate = payload?.template && typeof payload.template === 'object'
    ? {
        ...payload.template,
        ...(payload.secondaryLogoUrl
          ? {
              secondaryLogoUrl: payload.secondaryLogoUrl,
              logoUrl: payload.secondaryLogoUrl,
            }
          : {}),
      }
    : {};

  return (
    <div className={isEmbedded ? 'min-h-0 overflow-x-hidden bg-white' : 'min-h-screen overflow-x-hidden bg-neutral-100 px-3 py-4 sm:px-4 sm:py-6 print:m-0 print:min-h-0 print:bg-white print:px-0 print:py-0 print:overflow-hidden'}>
      <style>
        {`
          @page {
            size: A4 landscape;
            margin: 0;
          }

          @media print {
            html, body, #root {
              width: 297mm;
              height: 210mm;
              background: #ffffff;
              overflow: hidden;
            }

            body {
              margin: 0;
            }

            #root {
              margin: 0;
              padding: 0;
            }

            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>
      {!isEmbedded ? (
        <div className="mx-auto mb-4 flex max-w-4xl flex-col items-start justify-between gap-3 print:hidden sm:flex-row sm:items-center">
          <Link to={backLink} className="text-yellow-600 underline text-sm">Kembali</Link>
          {isPremiumResult ? (
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-600"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download PDF
            </button>
          ) : (
            <div className="rounded-lg border border-yellow-400/40 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-700">
              Sertifikat lengkap hanya tersedia untuk hasil premium
            </div>
          )}
        </div>
      ) : null}
      <div ref={certificateRef} className="block bg-white leading-none print:h-[210mm] print:w-[297mm] print:overflow-hidden">
        <ResultCertificate
          template={resolvedTemplate}
          result={payload.result}
          resultId={payload.result?.resultId || payload.result?.id}
          certificateNumber={payload.certificateNumber}
          qrCodeDataUrl={payload.qrCodeDataUrl || ''}
          identityLabel={isPremiumResult ? 'No. Sertifikat' : 'Member ID'}
          identityValue={isPremiumResult ? payload.certificateNumber : (payload.result?.memberCode || payload.memberCode || payload.userId)}
          issuedAt={payload.issuedAt}
          certType={payload.certType || 'individu'}
          lockPremiumSections={!isPremiumResult}
        />
      </div>
    </div>
  );
}
