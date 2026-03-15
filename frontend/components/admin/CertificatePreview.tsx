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

export default function CertificatePreview({
  template = {},
  certType = 'individu',
  recipientName = 'NAMA PENERIMA',
  certificateNumber = 'NEWME-000000',
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
            issuedAt={date}
            personalityData={personalityData || SAMPLE_PERSONALITY_DATA}
            showPlaceholders
          />
        </div>
      </div>
    </div>
  );
}
