// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import OfficialCertificateRenderer from '../certificates/OfficialCertificateRenderer';

const CERTIFICATE_BASE_WIDTH = 1120;
const CERTIFICATE_BASE_HEIGHT = (CERTIFICATE_BASE_WIDTH * 210) / 297;

const SAMPLE_PERSONALITY_DATA = {
  code: 'aA',
  personalityType: 'AMBIVERT',
  personalityLabel: 'AMBIVERT',
  dominantElement: 'AIR',
  elementDescription: [
    'Mudah Responsip',
    'bahasa SPONTAN',
    'Sangat investigatif',
    'Sangat aktif',
    'Peka/sensitif',
    'Tersembunyi',
  ],
  karakter: [
    'Pengamat',
    'Performer',
    'Investigator',
    'Suka Suasana Baru',
    'Berpikir Campur',
    'Banyak Kawan',
    'Spontanitas',
    'Tenang',
    'Pendamai',
    'Spiritualis',
  ],
  kekuatanJatidiri: {
    tipe: 'Si ADAPTIF',
    kehidupan: 'RELA BERKORBAN',
    kesehatan: 'JANTUNG',
    kontribusi: 'PERDAMAIAN',
    kekhasan: 'TATAPAN',
    kharisma: 'SENYUMAN',
  },
  kompilasiAdaptasi: {
    Belajar: 'Merangkum',
    Bekerja: 'Bebas dalam Aturan',
    Kalibrasi: 'Ganti Suasana',
    DayaRaga: 'Refleks Emosi',
    Memimpin: 'Organisasi Swadaya / seni',
    JalurBisnis: 'Asisten - Pendukung karir',
  },
  ciriKhas: [
    'Fisik rata',
    'Penampil',
    'Entertainer',
    'Kulinary',
    'Berat badan cenderung stabil',
    'Bicara spontan',
  ],
  dibutuhkanPadaProfesi: 'Yang memerlukan suasana DAMAI & ENTERTAIN',
  elementScores: {
    AIR: { percentage: 42 },
    API: { percentage: 29 },
    TANAH: { percentage: 18 },
  },
};

const SAMPLE_QR_DATA_URL = 'data:image/png;base64,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';

export default function CertificatePreview({
  template = {},
  certType = 'individu',
  recipientName = 'NAMA PENERIMA',
  certificateNumber = 'NMC-2026-U000000',
  qrCodeDataUrl = '',
  date,
  personalityData = null,
  className = '',
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

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
    <div ref={containerRef} className={`w-full pb-2 ${className}`}>
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
            template={template}
            certType={certType}
            recipientName={recipientName}
            certificateNumber={certificateNumber}
            qrCodeDataUrl={qrCodeDataUrl || SAMPLE_QR_DATA_URL}
            issuedAt={date}
            personalityData={personalityData || SAMPLE_PERSONALITY_DATA}
            showPlaceholders
          />
        </div>
      </div>
    </div>
  );
}
