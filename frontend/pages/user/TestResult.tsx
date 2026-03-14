// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Share2, MessageCircle, Facebook, Instagram, Download } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const SITE_URL = window.location.origin;

// ── helper ──────────────────────────────────────────────────
const pct = (val, total) => total > 0 ? Math.round((val / total) * 100) : 0;

const ELEM_COLORS = {
  kayu: '#4CAF50', api: '#FF5722', tanah: '#FFC107',
  logam: '#9E9E9E', air: '#2196F3',
};
const ELEM_LABELS = {
  kayu: 'Kayu (Wood)', api: 'Api (Fire)', tanah: 'Tanah (Earth)', 
  logam: 'Logam (Metal)', air: 'Air (Water)',
};

const normalizeElementKey = (value) => String(value || '').trim().toLowerCase();
const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const getElementLabel = (value) => {
  const normalized = normalizeElementKey(value);
  return ELEM_LABELS[normalized] || String(value || '-');
};
const getElementShortLabel = (value) => getElementLabel(value).split(' ')[0] || String(value || '-');
const getElementColor = (value) => {
  const normalized = normalizeElementKey(value);
  return ELEM_COLORS[normalized] || '#888';
};

// ── PersonalityCode badge ────────────────────────────────────
function CodeBadge({ code }) {
  const prefix = code?.[0] || 'e';
  const suffix = code?.[1] || 'K';
  return (
    <div className="flex items-center justify-center">
      <div
        className="w-28 h-28 rounded-full border-4 border-yellow-400 flex items-center justify-center bg-white shadow-xl"
        style={{ fontFamily: 'serif' }}
      >
        <span className="text-4xl font-black text-gray-800 tracking-tight">
          <span className="text-yellow-500">{prefix}</span>
          <span className="text-gray-900">{suffix}</span>
        </span>
      </div>
    </div>
  );
}

// ── Element Score Bar (shows percentage of total) ────────────
function ElementBar({ name, percentage, showPercentage = true }) {
  const color = getElementColor(name);
  const label = getElementLabel(name);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-right text-gray-700 font-semibold">{getElementShortLabel(name)}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-3">
        <div 
          className="h-3 rounded-full transition-all duration-500" 
          style={{ width: `${percentage}%`, backgroundColor: color }} 
        />
      </div>
      {showPercentage && (
        <span className="w-10 text-gray-600 font-bold">{percentage}%</span>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function TestResult() {
  const { resultId, id: idParam } = useParams();
  const [searchParams] = useSearchParams();
  const id = resultId || idParam;
  const isEmbedded = searchParams.get('embed') === '1';
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('user_token');
        const res = await axios.get(`${API}/test-results/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setResult(res.data);
      } catch (e) {
        setError('Hasil test tidak ditemukan.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-yellow-600 animate-pulse text-lg font-semibold">Memuat hasil test...</p>
    </div>
  );

  if (error || !result) return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
      <p className="text-red-500">{error || 'Terjadi kesalahan'}</p>
      <Link to="/dashboard" className="text-yellow-600 underline">Kembali ke Dashboard</Link>
    </div>
  );

  const analysis = result.analysis || {};
  const insights = asObject(analysis.insights);
  const aiInsights = asObject(analysis.aiInsights);
  const elem = normalizeElementKey(analysis.dominantElement || 'kayu');
  const elemColor = getElementColor(elem);
  const elemScores = Object.entries(asObject(analysis.elementScores)).reduce((acc, [name, score]) => {
    const normalizedKey = normalizeElementKey(name);
    if (!normalizedKey) return acc;
    acc[normalizedKey] = (acc[normalizedKey] || 0) + asNumber(score);
    return acc;
  }, {});
  
  // Calculate percentages (total = 100%)
  const totalScore = Object.values(elemScores).reduce((sum, val) => sum + asNumber(val), 0) || 1;
  const elemPercentages = {};
  Object.entries(elemScores).forEach(([name, score]) => {
    elemPercentages[name] = Math.round((asNumber(score) / totalScore) * 100);
  });
  
  // Adjust to ensure total is exactly 100%
  const percentageSum = Object.values(elemPercentages).reduce((sum, val) => sum + val, 0);
  if (percentageSum !== 100 && Object.keys(elemPercentages).length > 0) {
    // Add/subtract difference to highest element
    const sortedElems = Object.entries(elemPercentages).sort(([,a], [,b]) => b - a);
    if (sortedElems.length > 0) {
      elemPercentages[sortedElems[0][0]] += (100 - percentageSum);
    }
  }
  
  // Get top 3 elements
  const top3Elements = Object.entries(elemPercentages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  
  const ka = asObject(insights.kompilasiAdaptasi);
  const karakter = asArray(insights.karakter);
  const kj = asObject(insights.kekuatanJatidiri);
  const keprib = Array.isArray(insights.elementDescription)
    ? insights.elementDescription
    : insights.elementDescription
      ? [insights.elementDescription]
      : [];
  const code = insights.code || '';
  const ciriKhas = asArray(insights.ciriKhas);
  const aiStrengths = asArray(aiInsights.kekuatanUtama);
  const aiGrowthAreas = asArray(aiInsights.areasPengembanganDiri);
  const aiCareerRecommendations = asArray(aiInsights.rekomendasiKarirSpesifik).filter((item) => item && typeof item === 'object');
  const aiStrategies = asArray(aiInsights.strategiPengembanganDiri).filter((item) => item && typeof item === 'object');
  const aiTips = asArray(aiInsights.tipsPraktis);

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      {/* Action bar */}
      {!isEmbedded && (
        <div className="max-w-4xl mx-auto mb-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center print:hidden">
          <Link to="/dashboard" className="text-yellow-600 underline text-sm">Kembali ke Dashboard</Link>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 transition flex items-center gap-2"
              data-testid="btn-print"
            >
              <Download className="w-4 h-4" />
              Cetak / PDF
            </button>
            
            <button
              onClick={() => {
                const text = `Hasil Analisa Kepribadian NEWME saya: ${insights.personalityLabel || analysis.personalityType || 'Unik'}! Kode: ${code}. Temukan potensimu juga di ${SITE_URL}`;
                const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(waUrl, '_blank');
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition flex items-center gap-2"
              data-testid="btn-share-wa"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            
            <button
              onClick={() => {
                const text = `Hasil Analisa Kepribadian NEWME saya: ${insights.personalityLabel || analysis.personalityType || 'Unik'}!`;
                const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${SITE_URL}/test-result/${id}`)}&quote=${encodeURIComponent(text)}`;
                window.open(fbUrl, '_blank', 'width=600,height=400');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              data-testid="btn-share-fb"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </button>
            
            <button
              onClick={() => {
                const text = `Hasil Analisa Kepribadian NEWME saya: ${insights.personalityLabel || analysis.personalityType || 'Unik'}! Kode: ${code}. Temukan potensimu juga di ${SITE_URL}`;
                navigator.clipboard.writeText(text);
                alert('Teks berhasil disalin! Paste ke Instagram Story atau feed Anda.');
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center gap-2"
              data-testid="btn-share-ig"
            >
              <Instagram className="w-4 h-4" />
              Instagram
            </button>
          </div>
        </div>
      )}

      {/* ═══════ SERTIFIKAT ═══════ */}
      <div
        ref={printRef}
        className="max-w-4xl mx-auto bg-white shadow-2xl"
        style={{ fontFamily: 'Arial, sans-serif', border: '2px solid #d4af37' }}
        data-testid="certificate-container"
      >
        {/* ── TOP DECORATION ── */}
        <div className="flex">
          {/* Left gold dots */}
          <div className="w-16 bg-gray-900 relative overflow-hidden" style={{ minHeight: 90 }}>
            <div className="absolute inset-0 opacity-40"
              style={{ backgroundImage: 'radial-gradient(circle, #d4af37 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
          </div>
          {/* Header content */}
          <div className="flex-1 flex items-start justify-between p-4 border-b-2" style={{ borderColor: '#d4af37' }}>
            {/* NEWME Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/images/newme-logo.png" 
                alt="NEWME Logo" 
                className="w-16 h-16 object-contain"
              />
              <div>
                <p className="font-black text-xl text-gray-900 leading-none">NEW ME</p>
                <p className="text-xs text-gray-500 italic">Jatidirimu di sini</p>
              </div>
            </div>

            {/* Title */}
            <div className="text-right">
              <h1 className="text-xl font-black text-gray-900 leading-tight">SERTIFIKAT</h1>
              <p className="text-xs font-bold text-gray-700">ANALISA KEPRIBADIAN & JATIDIRI</p>
              <p className="text-xs text-gray-500 mt-1">
                ID: <span className="font-mono font-bold">{id.slice(-8).toUpperCase()}</span>
              </p>
              <p className="text-xs italic text-gray-500 mt-0.5">Optimalkan versi terbaik_mu</p>
            </div>
          </div>
        </div>

        {/* ── BODY: 2 columns ── */}
        <div className="flex">
          {/* ═══ LEFT COLUMN ═══ */}
          <div className="flex-1 p-5 border-r" style={{ borderColor: '#e5e7eb' }}>

            {/* Kepribadian */}
            <section className="mb-4">
              <h3 className="font-black text-sm text-gray-900 border-b pb-1 mb-2" style={{ borderColor: '#d4af37' }}>
                Kepribadian :
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed">
                {Array.isArray(keprib) ? keprib.join(' - ') : keprib}
              </p>
            </section>

            {/* Karakter - TEASER for free test */}
            <section className="mb-4 relative">
              <h3 className="font-black text-sm text-gray-900 border-b pb-1 mb-2" style={{ borderColor: '#d4af37' }}>
                +/- Karakter :
              </h3>
              {result.testType === 'free' ? (
                <div className="relative">
                  <p className="text-xs text-gray-700 leading-relaxed blur-sm select-none">
                    {karakter.length > 0 ? karakter.join(' - ') : 'Karakter lengkap tersedia di Test Premium'}
                  </p>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80 flex items-center justify-center">
                    <span className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                      UPGRADE KE PREMIUM
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-700 leading-relaxed">
                  {karakter.join(' - ')}
                </p>
              )}
            </section>

            {/* Kekuatan Jatidiri - TEASER for free test */}
            <section className="mb-4 relative">
              <h3 className="font-black text-sm text-gray-900 border-b pb-1 mb-1" style={{ borderColor: '#d4af37' }}>
                Kekuatan Jatidiri :{' '}
                <span className="text-yellow-600">{kj.tipe || 'Si UNIK'}</span>
              </h3>
              {result.testType === 'free' ? (
                <div className="relative">
                  <div className="text-xs text-gray-700 space-y-0.5 blur-sm select-none">
                    <p>Kehidupan : <strong>***</strong> - Kesehatan : <strong>***</strong></p>
                    <p>Kontribusi : <strong>***</strong> - Kekhasan : <strong>***</strong></p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-yellow-600 text-xs font-bold">Tersedia di Premium</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-700 space-y-0.5">
                  {kj.kehidupan && <p>Kehidupan : <strong>{kj.kehidupan}</strong> - Kesehatan : <strong>{kj.kesehatan}</strong></p>}
                  {kj.kontribusi && <p>Kontribusi : <strong>{kj.kontribusi}</strong> - Kekhasan : <strong>{kj.kekhasan}</strong> - Kharisma : <strong>{kj.kharisma}</strong></p>}
                </div>
              )}
            </section>

            {/* Kompilasi Adaptasi - Only for Premium */}
            {result.testType === 'paid' && Object.keys(ka).length > 0 && (
              <section className="mb-4">
                <h3 className="font-black text-sm text-gray-900 border-b pb-1 mb-2" style={{ borderColor: '#d4af37' }}>
                  Kompilasi Adaptasi :
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed" style={{ wordBreak: 'break-word' }}>
                  {Object.entries(ka).map(([k, v]) =>
                    `${k.replace(/([A-Z])/g, ' $1').trim()} : ${v}`
                  ).join(' - ')}
                </p>
              </section>
            )}
            
            {/* Kompilasi Adaptasi TEASER for Free */}
            {result.testType === 'free' && (
              <section className="mb-4">
                <h3 className="font-black text-sm text-gray-900 border-b pb-1 mb-2" style={{ borderColor: '#d4af37' }}>
                  Kompilasi Adaptasi :
                </h3>
                <div className="relative">
                  <div className="text-xs text-gray-400 blur-sm select-none">
                    Analisis komprehensif tentang cara Anda beradaptasi dalam berbagai situasi...
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">Khusus Premium</span>
                  </div>
                </div>
              </section>
            )}

            {/* Element Scores - Top 3 Only with Percentage (Total = 100%) - BLUR for free */}
            <section className="relative">
              <h3 className="font-black text-sm text-gray-900 border-b pb-1 mb-2" style={{ borderColor: '#d4af37' }}>
                Skor 5 Elemen (Top 3) :
              </h3>
              {result.testType === 'free' ? (
                <div className="relative">
                  <div className="space-y-2 blur-sm select-none">
                    {[1,2,3].map((i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold flex items-center justify-center">{i}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div className="h-3 rounded-full bg-gray-400" style={{ width: `${80-i*15}%` }} />
                        </div>
                        <span className="w-10 text-gray-600 font-bold">**%</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded animate-pulse">UPGRADE KE PREMIUM</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {top3Elements.map(([name, percentage], index) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <ElementBar name={name} percentage={percentage} />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2 italic">
                *Total 5 elemen = 100%
              </p>
            </section>
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div className="w-60 p-5 flex flex-col gap-4">

            {/* Code Badge */}
            <div className="text-center">
              <CodeBadge code={code} />
            </div>

            {/* Kepribadian type */}
            <section>
              <h3 className="font-black text-xs text-gray-900 mb-1">Kepribadian :</h3>
              <p className="text-base font-black" style={{ color: elemColor }}>
                {insights.personalityLabel || analysis.personalityType || 'AMBIVERT'}
              </p>
            </section>

            {/* Simbol Jatidiri - BLUR for free */}
            <section className="relative">
              <h3 className="font-black text-xs text-gray-900 mb-1">Simbol Jatidiri :</h3>
              {result.testType === 'free' ? (
                <div className="relative">
                  <div className="text-xs space-y-1 blur-sm select-none">
                    <p><span className="text-gray-500">Dominan I :</span> <span className="font-bold">***</span></p>
                    <p><span className="text-gray-500">Dominan II :</span> <span className="font-bold">***</span></p>
                    <p><span className="text-gray-500">Dominan III :</span> <span className="font-bold">***</span></p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded">PREMIUM</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs space-y-1">
                  {top3Elements.map(([name, percentage], i) => (
                    <p key={name}>
                      <span className="text-gray-500">Dominan {['I', 'II', 'III'][i]} :</span>{' '}
                      <span className="font-bold capitalize" style={{ color: getElementColor(name) }}>
                        {getElementShortLabel(name)} ({percentage}%)
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </section>

            {/* Ciri Khas - BLUR for free */}
            <section className="relative">
              <h3 className="font-black text-xs text-gray-900 mb-1">Ciri Khas :</h3>
              {result.testType === 'free' ? (
                <div className="relative">
                  <p className="text-xs text-gray-700 blur-sm select-none">Menarik - Tampil Beda - Charming</p>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded">PREMIUM</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-700">{ciriKhas.length > 0 ? ciriKhas.join(' - ') : '-'}</p>
              )}
            </section>

            {/* Dibutuhkan Profesi - BLUR for free */}
            <section className="relative">
              <h3 className="font-black text-xs text-gray-900 mb-1">Rekomendasi Karir :</h3>
              {result.testType === 'free' ? (
                <div className="relative">
                  <p className="text-xs text-gray-700 italic blur-sm select-none">Pilot, Guru, Dokter, Pengusaha...</p>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded">PREMIUM</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-700 italic">{insights.rekomendasiKarir || insights.dibutuhkanPadaProfesi || '-'}</p>
              )}
            </section>

            {/* Test type badge */}
            <div className="mt-auto">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                result.testType === 'paid' ?
                   'bg-yellow-100 text-yellow-700 border border-yellow-400'
                  : 'bg-green-100 text-green-700 border border-green-400'
              }`}>
                {result.testType === 'paid' ? 'NEWME Premium' : 'NEWME TEST'}
              </span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex items-end justify-between px-5 py-4 border-t-2" style={{ borderColor: '#d4af37' }}>
          <div className="flex items-end gap-3">
            {/* QR Code Signature - Premium Only */}
            {result.testType === 'paid' && (
              <div className="flex-shrink-0">
                <img 
                  src="/signature-qr.jpg" 
                  alt="Signature QR" 
                  className="w-16 h-16 object-contain"
                />
              </div>
            )}
            <div>
              <div className="w-24 border-b-2 border-gray-800 mb-1" />
              <p className="text-xs font-bold text-gray-800">ABIE DIBYO</p>
              <p className="text-xs text-gray-500">Chairman & B. Development</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">
              {new Date(result.completedAt || result.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
          </div>
          {/* Right gold decoration */}
          <div className="w-20 h-14 relative overflow-hidden rounded-lg"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 60%, #d4af37)' }}>
            <p className="absolute bottom-1 right-2 text-yellow-400 text-xs font-bold">NEW ME</p>
          </div>
        </div>
      </div>

      {/* ── AI Insights Section (Premium Only) ── */}
      {result.testType === 'paid' && Object.keys(aiInsights).length > 0 && (
        <div className="max-w-4xl mx-auto mt-6 bg-white shadow-2xl rounded-xl overflow-hidden border-2 border-yellow-400">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              Analisis AI Personal - Khusus Premium
            </h2>
            <p className="text-white/90 text-sm mt-1">Insights mendalam berdasarkan 25 jawaban Anda</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Ringkasan Kepribadian */}
            {aiInsights.ringkasanKepribadian && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Ringkasan Kepribadian Anda
                </h3>
                <p className="text-gray-700 leading-relaxed bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                  {aiInsights.ringkasanKepribadian}
                </p>
              </section>
            )}

            {/* Kekuatan Utama */}
            {aiStrengths.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Kekuatan Utama Anda
                </h3>
                <ul className="space-y-2">
                  {aiStrengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-3 bg-green-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Areas Pengembangan Diri */}
            {aiGrowthAreas.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Area Pengembangan Diri
                </h3>
                <ul className="space-y-2">
                  {aiGrowthAreas.map((area, i) => (
                    <li key={i} className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <span className="text-gray-700">{area}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Rekomendasi Karir Spesifik */}
            {aiCareerRecommendations.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Rekomendasi Karir Spesifik
                </h3>
                <div className="grid gap-4">
                  {aiCareerRecommendations.map((career, i) => (
                    <div key={i} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-bold text-purple-900 mb-2">{career.bidang || 'Rekomendasi Karir'}</h4>
                      <p className="text-gray-700 text-sm mb-3">{career.alasan || '-'}</p>
                      {asArray(career.roleContoh).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {asArray(career.roleContoh).map((role, j) => (
                            <span key={j} className="bg-purple-200 text-purple-800 text-xs px-3 py-1 rounded-full font-semibold">
                              {role}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Strategi Pengembangan Diri */}
            {aiStrategies.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Strategi Pengembangan Diri
                </h3>
                <div className="space-y-4">
                  {aiStrategies.map((strategy, i) => (
                    <div key={i} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-bold text-orange-900 mb-2">{strategy.area || 'Strategi Pengembangan'}</h4>
                      <ul className="space-y-1">
                        {asArray(strategy.langkahKonkret).map((step, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-orange-500 mt-0.5">-</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tips Praktis */}
            {aiTips.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Tips Praktis Sehari-hari
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {aiTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <span className="text-yellow-500 text-lg">OK</span>
                      <span className="text-gray-700 text-sm">{tip}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Motivational Message */}
            {aiInsights.motivationalMessage && (
              <section className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-lg border-2 border-yellow-400">
                <h3 className="text-lg font-bold text-gray-900 mb-3 text-center flex items-center justify-center gap-2">
                  Pesan Motivasi untuk Anda
                </h3>
                <p className="text-gray-800 text-center leading-relaxed italic text-lg">
                  "{aiInsights.motivationalMessage}"
                </p>
              </section>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              Analisis ini dibuat oleh AI berdasarkan jawaban unik Anda dan bukan template umum
            </p>
          </div>
        </div>
      )}

      {/* ── Pesan untuk Free Test ── */}
      {result.testType === 'free' && (
        <div className="max-w-4xl mx-auto mt-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-xl p-6 print:hidden shadow-lg">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-bold">
              <span className="animate-pulse">INFO</span> HASIL TEST GRATIS
            </div>
            <h3 className="text-xl font-black text-gray-900">
              Penasaran dengan Analisis Lengkap Anda
            </h3>
            <p className="text-gray-700 text-sm max-w-lg mx-auto">
              Hasil di atas hanya <strong>30%</strong> dari total analisis kepribadian Anda. 
              Upgrade ke <strong>Test Premium</strong> untuk mendapatkan:
            </p>
            <ul className="text-left max-w-md mx-auto text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-green-500">OK</span> Analisis karakter positif & negatif lengkap
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">OK</span> Kompilasi Adaptasi untuk pengembangan diri
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">OK</span> Rekomendasi karir berdasarkan kepribadian dengan AI
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">OK</span> Strategi pengembangan diri konkret dengan AI
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">OK</span> Tips praktis sehari-hari personal
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">OK</span> Sertifikat resmi yang bisa di-download
              </li>
            </ul>
            <Link to="/dashboard" className="inline-block px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all text-sm mt-2">
              Upgrade ke Test Premium
            </Link>
            <p className="text-xs text-gray-500">Mulai Rp 100.000 untuk analisis AI lengkap dan akses premium</p>
          </div>
        </div>
      )}
    </div>
  );
}
