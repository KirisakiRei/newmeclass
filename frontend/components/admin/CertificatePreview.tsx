// @ts-nocheck
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Move, RotateCcw } from 'lucide-react';

// ── Sample placeholder data shown in edit-mode preview ──
const SAMPLE = {
  code: 'eK',
  personalityLabel: 'AMBIVERT KAYU',
  keprib: 'Idealis - Visioner - Kreatif - Empatik - Perfeksionis',
  karakter: 'Analitis - Sistematis - Detail-Oriented - Sabar - Tekun',
  kj: { tipe: 'Si INOVATOR', kehidupan: 'Penyeimbang', kesehatan: 'Aktif', kontribusi: 'Inspirator', kekhasan: 'Unik Mandiri' },
  ciriKhas: 'Menarik - Tampil Beda - Penuh Potensi',
  rekomendasiKarir: 'Konsultan, Guru, Psikolog, Pengusaha',
  elements: [
    { name: 'Kayu', pct: 35, color: '#4CAF50' },
    { name: 'Api',  pct: 28, color: '#FF5722' },
    { name: 'Tanah',pct: 22, color: '#FFC107' },
  ],
};

const ELEMENT_COLORS = {
  KAYU: '#4CAF50',
  API: '#FF5722',
  TANAH: '#FFC107',
  LOGAM: '#9E9E9E',
  AIR: '#2196F3',
};

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const toInlineText = (value) => Array.isArray(value) ? value.filter(Boolean).join(' - ') : (value || '');

// ── Code circle badge ──
const CodeBadge = ({ code }) => (
  <div className="flex items-center justify-center">
    <div
      className="rounded-full border-4 border-yellow-400 flex items-center justify-center bg-white shadow-xl"
      style={{ width: '3.5rem', height: '3.5rem', fontFamily: 'serif' }}
    >
      <span className="font-black text-gray-800 tracking-tight" style={{ fontSize: '1.4rem' }}>
        <span style={{ color: '#d4af37' }}>{code?.[0] || 'e'}</span>
        <span className="text-gray-900">{code?.[1] || 'K'}</span>
      </span>
    </div>
  </div>
);

// ── Section block ──
const Sec = ({ title, accentColor, children }) => (
  <div style={{ marginBottom: '0.4rem' }}>
    <h3
      style={{
        fontWeight: 900,
        fontSize: '0.65rem',
        color: '#111827',
        borderBottom: `1px solid ${accentColor}`,
        paddingBottom: '0.1rem',
        marginBottom: '0.2rem',
      }}
    >
      {title}
    </h3>
    {children}
  </div>
);

// ─── Draggable asset overlay (logo / signature) ───
const DraggableAsset = ({ src, alt, position, onPositionChange, editable, containerRef, imgStyle }) => {
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef({ dx: 0, dy: 0 });

  const toPercent = useCallback((clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(97, Math.max(3, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(97, Math.max(3, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, [containerRef]);

  const handleStart = useCallback((clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect) return;
    const elemX = (position.x / 100) * rect.width + rect.left;
    const elemY = (position.y / 100) * rect.height + rect.top;
    offsetRef.current = { dx: clientX - elemX, dy: clientY - elemY };
    setDragging(true);
  }, [containerRef, position]);

  const handleMove = useCallback((clientX, clientY) => {
    if (!dragging) return;
    const pt = toPercent(clientX - offsetRef.current.dx, clientY - offsetRef.current.dy);
    if (pt) onPositionChange({ ...position, x: pt.x, y: pt.y });
  }, [dragging, toPercent, onPositionChange, position]);

  const handleEnd = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e) => { e.preventDefault(); handleMove(e.clientX, e.clientY); };
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchEnd = () => handleEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragging, handleMove, handleEnd]);

  if (!src) return null;

  const containerStyle = {
    position: 'absolute',
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: 'translate(-50%, -50%)',
    width: `${position.width || 8}%`,
    zIndex: dragging ? 30 : 20,
    cursor: editable ? (dragging ? 'grabbing' : 'grab') : 'default',
    userSelect: 'none',
    touchAction: 'none',
  };

  return (
    <div
      style={containerStyle}
      onMouseDown={(e) => { if (editable) { e.preventDefault(); handleStart(e.clientX, e.clientY); } }}
      onTouchStart={(e) => { if (editable) { handleStart(e.touches[0].clientX, e.touches[0].clientY); } }}
      className={`group ${editable ? 'hover:outline hover:outline-2 hover:outline-dashed hover:outline-blue-400 hover:outline-offset-1 rounded' : ''} ${dragging ? 'outline outline-2 outline-dashed outline-blue-500 outline-offset-1 rounded' : ''}`}
    >
      <img src={src} alt={alt} style={{ width: '100%', height: 'auto', pointerEvents: 'none', ...(imgStyle || {}) }} draggable={false} />
      {editable && !dragging && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-0.5 pointer-events-none">
          <Move className="w-2 h-2" /> Drag
        </div>
      )}
    </div>
  );
};

// ─── Main CertificatePreview ─── mirrors TestResult.jsx certificate design ───
const CertificatePreview = ({
  template = {},
  certType = 'individu',
  recipientName = 'NAMA PENERIMA',
  courseName = 'NEWME Test - Personality Assessment',
  certificateNumber = 'NMC-2026-XXXXX',
  date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
  personalityData = null,
  editable = false,
  onLayoutChange,
  className = '',
}) => {
  const containerRef = useRef(null);
  const isVip = certType === 'yayasan';

  const {
    titleText = isVip ? 'SERTIFIKAT VIP' : 'SERTIFIKAT',
    subtitleText = 'ANALISA KEPRIBADIAN & JATIDIRI',
    signerName = 'ABIE DIBYO',
    signerTitle = 'Chairman & B. Development',
    backgroundUrl,
    logoUrl,
    signatureUrl,
    layoutPositions = {},
  } = template;

  const GOLD = isVip ? '#B8860B' : '#d4af37';

  // Default positions inside certificate (percent of container size)
  const logoPos = layoutPositions.logo || { x: 8, y: 7, width: 6 };
  const signaturePos = layoutPositions.signature || { x: 8.5, y: 90, width: 7  };
  const resolvedPersonalityData = (() => {
    const data = asObject(personalityData);
    if (!Object.keys(data).length) return SAMPLE;

    const scoreEntries = Object.entries(asObject(data.elementScores))
      .map(([name, score]) => {
        const key = String(name || '').toUpperCase();
        const pct = Number(score?.percentage ?? score ?? 0) || 0;
        return {
          name: key.charAt(0) + key.slice(1).toLowerCase(),
          pct,
          color: ELEMENT_COLORS[key] || '#d4af37',
        };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);

    return {
      code: data.code || SAMPLE.code,
      personalityLabel: data.personalityLabel || data.personalityType || SAMPLE.personalityLabel,
      keprib: toInlineText(data.elementDescription) || SAMPLE.keprib,
      karakter: toInlineText(data.karakter) || SAMPLE.karakter,
      kj: { ...SAMPLE.kj, ...asObject(data.kekuatanJatidiri) },
      ciriKhas: toInlineText(data.ciriKhas) || SAMPLE.ciriKhas,
      rekomendasiKarir: toInlineText(data.rekomendasiKarir) || SAMPLE.rekomendasiKarir,
      elements: scoreEntries.length ? scoreEntries : SAMPLE.elements,
    };
  })();

  const handleAssetChange = (key, pos) => {
    if (!editable || !onLayoutChange) return;
    onLayoutChange({ ...layoutPositions, [key]: pos });
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Drag toolbar */}
      {editable && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
          <Move className="w-3 h-3 shrink-0" />
          <span>Drag logo dan tanda tangan di preview untuk mengatur posisi</span>
          {onLayoutChange && (
            <button
              onClick={() => onLayoutChange({
                logo:      { x: 8,   y: 7,  width: 6 },
                signature: { x: 8.5, y: 90, width: 7 },
              })}
              className="ml-auto flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" /> Reset posisi
            </button>
          )}
        </div>
      )}

      {/* ═══ CERTIFICATE FRAME ═══
          White background, gold border — matches TestResult.jsx exactly */}
      <div
        ref={containerRef}
        className="relative bg-white shadow-2xl overflow-hidden"
        style={{ fontFamily: 'Arial, sans-serif', border: `2px solid ${GOLD}` }}
      >
        {/* Semi-transparent background image if uploaded */}
        {backgroundUrl && (
          <img
            src={backgroundUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ zIndex: 0, opacity: 0.12 }}
            draggable={false}
          />
        )}

        {/* ── All content above background ── */}
        <div className="relative" style={{ zIndex: 1 }}>

          {/* ── TOP ROW: dark left panel + header ── */}
          <div className="flex">
            {/* Dark left panel with gold dot pattern */}
            <div
              className="relative overflow-hidden shrink-0"
              style={{
                width: '4rem',
                minHeight: '5.5rem',
                background: isVip ?
                   `linear-gradient(to bottom, #111827 60%, ${GOLD}99)`
                  : '#111827',
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  opacity: 0.4,
                  backgroundImage: `radial-gradient(circle, ${GOLD} 1px, transparent 1px)`,
                  backgroundSize: '8px 8px',
                }}
              />
              {isVip && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 font-bold"
                  style={{ color: GOLD, fontSize: '9px' }}
                >
                  VIP
                </span>
              )}
            </div>

            {/* Header: logo left, title right */}
            <div
              className="flex-1 flex items-start justify-between p-3 border-b-2"
              style={{ borderColor: GOLD }}
            >
              {/* Logo + brand name */}
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="object-contain"
                    style={{ height: '2.5rem', width: 'auto', pointerEvents: 'none' }}
                    draggable={false}
                  />
                ) : (
                  <div
                    className="rounded flex items-center justify-center text-gray-400"
                    style={{ width: '2.5rem', height: '2.5rem', background: '#f3f4f6', fontSize: '8px', fontWeight: 700 }}
                  >
                    LOGO
                  </div>
                )}
                <div>
                  <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1rem' }}>NEW ME</p>
                  <p className="text-gray-500 italic" style={{ fontSize: '0.6rem' }}>Jatidirimu di sini</p>
                </div>
              </div>

              {/* Certificate title */}
              <div className="text-right">
                <h1
                  className="font-black leading-tight"
                  style={{ fontSize: '1rem', color: isVip ? GOLD : '#111827' }}
                >
                  {titleText}
                </h1>
                <p className="font-bold text-gray-700" style={{ fontSize: '0.6rem' }}>{subtitleText}</p>
                <p className="font-mono text-gray-500" style={{ fontSize: '0.6rem', marginTop: '0.1rem' }}>
                  ID: {certificateNumber.slice(-8).toUpperCase()}
                </p>
                <p className="text-gray-400 italic" style={{ fontSize: '0.55rem', marginTop: '0.1rem' }}>
                  Optimalkan versi terbaik_mu
                </p>
              </div>
            </div>
          </div>

          {/* ── BODY: 2 columns ── */}
          <div className="flex">

            {/* LEFT COLUMN — personality data */}
            <div className="flex-1 p-3 border-r" style={{ borderColor: '#e5e7eb' }}>

              {/* Diberikan kepada */}
              <div
                className="rounded mb-2 px-2 py-1"
                style={{ background: isVip ? `${GOLD}18` : '#fefce8', border: `1px solid ${GOLD}50` }}
              >
                <span className="font-black text-gray-700" style={{ fontSize: '0.65rem' }}>Diberikan kepada: </span>
                <span className="font-black text-gray-900" style={{ fontSize: '0.8rem' }}>{recipientName}</span>
              </div>

              <Sec title="Kepribadian :" accentColor={GOLD}>
                <p className="text-gray-700" style={{ fontSize: '0.6rem', lineHeight: 1.5 }}>{resolvedPersonalityData.keprib}</p>
              </Sec>

              <Sec title="+/- Karakter :" accentColor={GOLD}>
                <p className="text-gray-700" style={{ fontSize: '0.6rem', lineHeight: 1.5 }}>{resolvedPersonalityData.karakter}</p>
              </Sec>

              <Sec title={`Kekuatan Jatidiri : ${resolvedPersonalityData.kj.tipe}`} accentColor={GOLD}>
                <p className="text-gray-700" style={{ fontSize: '0.6rem' }}>
                  Kehidupan : <strong>{resolvedPersonalityData.kj.kehidupan}</strong> &ndash; Kesehatan : <strong>{resolvedPersonalityData.kj.kesehatan}</strong>
                </p>
                <p className="text-gray-700" style={{ fontSize: '0.6rem' }}>
                  Kontribusi : <strong>{resolvedPersonalityData.kj.kontribusi}</strong> &ndash; Kekhasan : <strong>{resolvedPersonalityData.kj.kekhasan}</strong>
                </p>
              </Sec>

              <Sec title="Skor 5 Elemen (Top 3) :" accentColor={GOLD}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {resolvedPersonalityData.elements.map(({ name, pct, color }, i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        className="font-bold flex items-center justify-center"
                        style={{
                          width: '1rem', height: '1rem',
                          borderRadius: '50%',
                          background: '#d4af37',
                          color: '#000',
                          fontSize: '0.5rem',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-right font-semibold text-gray-700" style={{ fontSize: '0.55rem', width: '2.8rem' }}>{name}</span>
                      <div className="rounded-full" style={{ flex: 1, background: '#e5e7eb', height: '6px' }}>
                        <div className="rounded-full" style={{ width: `${pct}%`, height: '6px', background: color }} />
                      </div>
                      <span className="font-bold text-gray-600" style={{ fontSize: '0.55rem', width: '2rem' }}>{pct}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-gray-400 italic" style={{ fontSize: '0.5rem', marginTop: '2px' }}>*Total 5 elemen = 100%</p>
              </Sec>
            </div>

            {/* RIGHT COLUMN — code + classifications */}
            <div className="p-3 flex flex-col gap-2 shrink-0" style={{ width: '10rem' }}>
              <div className="flex justify-center">
                <CodeBadge code={resolvedPersonalityData.code} />
              </div>

              <div>
                <p className="font-black text-gray-900" style={{ fontSize: '0.6rem', marginBottom: '1px' }}>Kepribadian :</p>
                <p className="font-black" style={{ fontSize: '0.75rem', color: '#4CAF50' }}>{resolvedPersonalityData.personalityLabel}</p>
              </div>

              <div>
                <p className="font-black text-gray-900" style={{ fontSize: '0.6rem', marginBottom: '1px' }}>Simbol Jatidiri :</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {resolvedPersonalityData.elements.map(({ name, color }, i) => (
                    <p key={name} style={{ fontSize: '0.55rem' }}>
                      <span className="text-gray-500">Dominan {['I', 'II', 'III'][i]} : </span>
                      <span className="font-bold" style={{ color }}>{name}</span>
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-black text-gray-900" style={{ fontSize: '0.6rem', marginBottom: '1px' }}>Ciri Khas :</p>
                <p className="text-gray-700" style={{ fontSize: '0.55rem' }}>{resolvedPersonalityData.ciriKhas}</p>
              </div>

              <div>
                <p className="font-black text-gray-900" style={{ fontSize: '0.6rem', marginBottom: '1px' }}>Rekomendasi Karir :</p>
                <p className="text-gray-700 italic" style={{ fontSize: '0.55rem' }}>{resolvedPersonalityData.rekomendasiKarir}</p>
              </div>

              <div className="mt-auto">
                <span
                  className="font-bold rounded-full px-2 py-0.5"
                  style={{
                    fontSize: '0.55rem',
                    background: isVip ? '#fefce8' : '#f0fdf4',
                    color: isVip ? '#92400e' : '#166534',
                    border: `1px solid ${isVip ? '#d4af37' : '#86efac'}`,
                  }}
                >
                  {isVip ? 'NEWME VIP' : 'NEWME TEST'}
                </span>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div
            className="flex items-end justify-between px-3 py-2 border-t-2"
            style={{ borderColor: GOLD }}
          >
            {/* Signer block */}
            <div className="flex items-end gap-2">
              {signatureUrl ? (
                <img
                  src={signatureUrl}
                  alt="Signature"
                  style={{ height: '2rem', width: 'auto', objectFit: 'contain', pointerEvents: 'none' }}
                  draggable={false}
                />
              ) : (
                <div style={{ width: '2.5rem', height: '2rem' }} />
              )}
              <div>
                <div className="border-b-2 border-gray-800" style={{ width: '5rem', marginBottom: '2px' }} />
                <p className="font-black text-gray-800" style={{ fontSize: '0.65rem' }}>{signerName}</p>
                <p className="text-gray-500" style={{ fontSize: '0.55rem' }}>{signerTitle}</p>
              </div>
            </div>

            {/* Date */}
            <div className="text-center">
              <p className="text-gray-400" style={{ fontSize: '0.6rem' }}>{date}</p>
            </div>

            {/* Right decorative gold block */}
            <div
              className="relative overflow-hidden rounded"
              style={{
                width: '4rem',
                height: '2.5rem',
                background: `linear-gradient(135deg, #1a1a1a 60%, ${GOLD})`,
              }}
            >
              <p
                className="absolute bottom-1 right-1 font-bold"
                style={{ color: '#d4af37', fontSize: '0.55rem' }}
              >
                NEW ME
              </p>
            </div>
          </div>
        </div>

        {/* ── Draggable overlays (absolute, in containerRef coords) ── */}
        {editable && (
          <>
            <DraggableAsset
              src={logoUrl}
              alt="Logo"
              position={logoPos}
              onPositionChange={(p) => handleAssetChange('logo', p)}
              editable={editable}
              containerRef={containerRef}
              imgStyle={{ opacity: logoUrl ? 0.85 : 0 }}
            />
            <DraggableAsset
              src={signatureUrl}
              alt="Signature"
              position={signaturePos}
              onPositionChange={(p) => handleAssetChange('signature', p)}
              editable={editable}
              containerRef={containerRef}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CertificatePreview;
