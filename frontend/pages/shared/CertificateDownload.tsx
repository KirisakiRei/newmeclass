// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Printer } from 'lucide-react';
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
  const shouldAutoPrint = searchParams.get('download') === '1';
  const isEmbedded = searchParams.get('embed') === '1';
  const viewer = resolveViewerContext(searchParams.get('viewer'));
  const backLink = resolveBackLink(viewer);
  const isPremiumResult = payload?.result?.testType === 'paid';

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

  useEffect(() => {
    if (isEmbedded || !shouldAutoPrint || loading || !payload || !isPremiumResult) return undefined;

    const closeAfterPrint = () => {
      window.removeEventListener('afterprint', closeAfterPrint);
      window.close();
    };
    const timer = window.setTimeout(() => {
      window.addEventListener('afterprint', closeAfterPrint);
      window.print();
    }, 300);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', closeAfterPrint);
    };
  }, [isPremiumResult, loading, payload, shouldAutoPrint]);

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

  return (
    <div className={isEmbedded ? 'min-h-0 bg-white' : 'min-h-screen bg-neutral-100 py-6 px-4 print:min-h-0 print:bg-white print:px-0 print:py-0'}>
      <style>
        {`
          @page {
            size: A4 landscape;
            margin: 0;
          }

          @media print {
            html, body {
              width: 297mm;
              height: 210mm;
              background: #ffffff;
            }

            body {
              margin: 0;
            }

            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>
      {!isEmbedded ? (
        <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between print:hidden">
          <Link to={backLink} className="text-yellow-600 underline text-sm">Kembali</Link>
          {isPremiumResult ? (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
          ) : (
            <div className="rounded-lg border border-yellow-400/40 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-700">
              Sertifikat lengkap hanya tersedia untuk hasil premium
            </div>
          )}
        </div>
      ) : null}
      <ResultCertificate
        template={payload.template || {}}
        result={payload.result}
        resultId={payload.result?.resultId || payload.result?.id}
        certificateNumber={payload.certificateNumber}
        identityLabel={isPremiumResult ? 'No. Sertifikat' : 'Member ID'}
        identityValue={isPremiumResult ? payload.certificateNumber : (payload.result?.memberCode || payload.memberCode || payload.userId)}
        issuedAt={payload.issuedAt}
        certType={payload.certType || 'individu'}
        lockPremiumSections={!isPremiumResult}
      />
    </div>
  );
}
