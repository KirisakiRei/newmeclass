// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, Facebook, Instagram, Download, Lock } from 'lucide-react';
import ResultCertificate from '../../components/certificates/ResultCertificate';
import { authAPI, testResultsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';

const SITE_URL = window.location.origin;

const ELEM_COLORS = {
  kayu: '#4CAF50', api: '#FF5722', tanah: '#FFC107',
  logam: '#9E9E9E', air: '#2196F3',
};
const ELEM_LABELS = {
  kayu: 'Kayu', api: 'Api', tanah: 'Tanah', 
  logam: 'Logam', air: 'Air',
};

const normalizeElementKey = (value) => String(value || '').trim().toLowerCase();
const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const stripCodeModifier = (value) => String(value || '').trim().replace(/\((\+|-|#)\)\s*$/, '');
const getCodeModifier = (value) => {
  const match = String(value || '').trim().match(/\((\+|-|#)\)\s*$/);
  return match ? match[0] : '';
};
const formatPercentage = (value) => asNumber(value).toFixed(2);
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
  const normalizedCode = stripCodeModifier(code);
  const prefix = normalizedCode?.[0] || 'e';
  const suffix = normalizedCode?.[1] || 'K';
  const modifier = getCodeModifier(code);
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className="w-28 h-28 rounded-full border-4 border-yellow-400 flex items-center justify-center bg-white shadow-xl"
        style={{ fontFamily: 'serif' }}
      >
        <span className="text-4xl font-black text-gray-800 tracking-tight">
          <span className="text-yellow-500">{prefix}</span>
          <span className="text-gray-900">{suffix}</span>
        </span>
      </div>
      {modifier ? (
        <span className="flex h-7 min-w-7 items-center justify-center rounded-md border border-yellow-500/30 bg-yellow-400/15 px-2 text-xs font-bold text-yellow-700">
          {modifier}
        </span>
      ) : null}
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
  const navigate = useNavigate();
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
        let payload = null;

        try {
          const res = await testResultsAPI.getById(id);
          payload = res.data;
        } catch (error) {
          if (error?.response?.status === 401) {
            await authAPI.refreshSession();
            const retried = await testResultsAPI.getById(id);
            payload = retried.data;
          } else {
            throw error;
          }
        }

        if (!payload) {
          setError('Hasil tes tidak dapat diakses dari akun ini. Silakan masuk dengan akun yang mengerjakan tes tersebut.');
          return;
        }

        setResult(payload);
      } catch (e) {
        setError(getApiErrorMessage(e, 'Hasil test tidak ditemukan.'));
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

  const analysis = asObject(result.analysis);
  const displayAnalysis = asObject(result.displayAnalysis);
  const insights = asObject(analysis.insights);
  const personalInsights = asObject(analysis.personalInsights || analysis.aiInsights);
  const coreScoring = asObject(result.coreScoring || analysis.coreScoring);
  const hasCoreScoring = Object.keys(coreScoring).length > 0;
  const exactElementScores = Object.entries(asObject(analysis.elementScores || displayAnalysis.elementScores || result.elementScores)).reduce((acc, [name, score]) => {
    const normalizedKey = normalizeElementKey(name);
    if (!normalizedKey) return acc;
    acc[normalizedKey] = (acc[normalizedKey] || 0) + asNumber(score?.percentage ?? score);
    return acc;
  }, {});
  const rankedElementScores = Object.entries(exactElementScores)
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
  const code = insights.code || result.personalityCode || '';
  const ciriKhas = asArray(insights.ciriKhas);
  const personalStrengths = asArray(personalInsights.kekuatanUtama);
  const personalGrowthAreas = asArray(personalInsights.areasPengembanganDiri);
  const personalCareerRecommendations = asArray(personalInsights.rekomendasiKarirSpesifik).filter((item) => item && typeof item === 'object');
  const personalStrategies = asArray(personalInsights.strategiPengembanganDiri).filter((item) => item && typeof item === 'object');
  const personalTips = asArray(personalInsights.tipsPraktis);
  const dominantRanks = hasCoreScoring
    ? [
        {
          rank: 'Dominan I',
          element: coreScoring.dominan_1_elemen,
          percentage: asNumber(coreScoring.dominan_1_persentase),
          note: 'Karakter utama yang paling kuat terlihat dalam profil Anda.',
        },
        {
          rank: 'Dominan II',
          element: coreScoring.dominan_2_elemen,
          percentage: asNumber(coreScoring.dominan_2_persentase),
          note: 'Sisi pendukung yang ikut membentuk cara Anda merespons banyak situasi.',
        },
        {
          rank: 'Dominan III',
          element: coreScoring.dominan_3_elemen,
          percentage: asNumber(coreScoring.dominan_3_persentase),
          note: 'Nuansa tambahan yang memberi warna pada gaya pribadi Anda.',
        },
      ].filter((item) => item.element)
    : rankedElementScores.map(([element, percentage], index) => ({
        rank: `Dominan ${['I', 'II', 'III'][index] || index + 1}`,
        element,
        percentage: asNumber(percentage),
        note: 'Distribusi skor elemen',
      }));

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      {/* Action bar */}
      {!isEmbedded && (
        <div className="max-w-4xl mx-auto mb-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center print:hidden">
          <Link to="/dashboard" className="text-yellow-600 underline text-sm">Kembali ke Dashboard</Link>
          <div className="flex flex-wrap gap-2">
            {result.testType === 'paid' ? (
              <button
                onClick={() => {
                  const targetUserId = result.userId;
                  if (!targetUserId) {
                    alert('Sertifikat belum tersedia untuk hasil ini.');
                    return;
                  }
                  navigate(`/certificate-download/${targetUserId}?download=1&viewer=user`);
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 transition flex items-center gap-2"
                data-testid="btn-print"
              >
                <Download className="w-4 h-4" />
                Download Sertifikat
              </button>
            ) : (
              <div className="px-4 py-2 border border-yellow-400/40 text-yellow-700 bg-yellow-50 rounded-lg text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Sertifikat premium terkunci
              </div>
            )}
            
            <button
              onClick={() => {
                const text = `Hasil Analisa Kepribadian NEWME saya: ${insights.personalityLabel || analysis.personalityType || displayAnalysis.personalityType || 'Unik'}! Kode: ${code}. Temukan potensimu juga di ${SITE_URL}`;
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
                const text = `Hasil Analisa Kepribadian NEWME saya: ${insights.personalityLabel || analysis.personalityType || displayAnalysis.personalityType || 'Unik'}!`;
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
                const text = `Hasil Analisa Kepribadian NEWME saya: ${insights.personalityLabel || analysis.personalityType || displayAnalysis.personalityType || 'Unik'}! Kode: ${code}. Temukan potensimu juga di ${SITE_URL}`;
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
      <div ref={printRef} className="max-w-6xl mx-auto">
        {result.testType === 'paid' && result.userId ? (
          <div className="overflow-hidden rounded-xl border border-yellow-400/20 bg-white shadow-xl">
            <iframe
              title="Preview Sertifikat"
              src={`/certificate-download/${result.userId}?embed=1&viewer=user`}
              className="block w-full border-0"
              style={{ aspectRatio: '297 / 210' }}
            />
          </div>
        ) : (
          <ResultCertificate
            result={result}
            resultId={result.resultId || result.id}
            certificateNumber={result.resultId || result.id}
            identityLabel="Member ID"
            identityValue={result.memberCode || result.publicId || result.userId}
            issuedAt={result.completedAt || result.createdAt}
            certType={
              result?.template?.certType === 'yayasan'
              || result?.certType === 'yayasan'
              || result?.isYayasanLinked === true
              || Boolean(result?.yayasanId || result?.yayasanName || result?.yayasanReferralCode)
              || String(result?.userRole || result?.user?.role || '').trim().toUpperCase() === 'YAYASAN'
                ? 'yayasan'
                : 'individu'
            }
            lockPremiumSections
          />
        )}
      </div>

      <div className="max-w-4xl mx-auto mt-6 bg-white shadow-2xl rounded-xl overflow-hidden border-2 border-yellow-400">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
          <h2 className="text-2xl font-black text-white">Ringkasan Hasil Kepribadian</h2>
          <p className="text-white/90 text-sm mt-1">
            {insights.personalityLabel || analysis.personalityType || displayAnalysis.personalityType || 'Profil kepribadian Anda'}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-[180px,1fr] md:items-center">
            <CodeBadge code={code} />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-bold text-yellow-700">
                  Kode: {code || '-'}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  Elemen dominan: {result.dominantElement || coreScoring.dominan_1_elemen || '-'}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {displayAnalysis.summary || personalInsights.ringkasanKepribadian || 'Ringkasan analisis belum tersedia.'}
              </p>
              {hasCoreScoring ? (
                <p className="text-xs text-gray-500 leading-relaxed">
                  Hasil ini merangkum karakter utama Anda beserta nuansa personal yang membuat profil Anda lebih khas.
                </p>
              ) : null}
            </div>
          </div>

          {dominantRanks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Peta Dominan Elemen</h3>
                  <p className="text-sm text-gray-500">
                    Tiga elemen berikut menunjukkan susunan karakter yang paling menonjol pada diri Anda.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {dominantRanks.map((item) => (
                  <div key={item.rank} className="rounded-xl border border-yellow-400/20 bg-yellow-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-700">{item.rank}</p>
                    <p className="mt-2 text-xl font-black text-gray-900">{getElementShortLabel(item.element)}</p>
                    <p className="text-sm text-gray-500">{getElementLabel(item.element)}</p>
                    <p className="mt-3 text-2xl font-black" style={{ color: getElementColor(item.element) }}>
                      {formatPercentage(item.percentage)}%
                    </p>
                    <p className="mt-2 text-xs text-gray-500">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {dominantRanks.map((item) => (
                  <ElementBar
                    key={`${item.rank}-${item.element}`}
                    name={item.element}
                    percentage={Math.min(Math.max(asNumber(item.percentage), 0), 100)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Personal Analysis Section (Premium Only) ── */}
      {result.testType === 'paid' && Object.keys(personalInsights).length > 0 && (
        <div className="max-w-4xl mx-auto mt-6 bg-white shadow-2xl rounded-xl overflow-hidden border-2 border-yellow-400">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              Analisis Personal
            </h2>
            <p className="text-white/90 text-sm mt-1">Hasil premium lengkap berdasarkan jawaban Anda</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Ringkasan Kepribadian */}
            {personalInsights.ringkasanKepribadian && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Ringkasan Kepribadian Anda
                </h3>
                <p className="text-gray-700 leading-relaxed bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                  {personalInsights.ringkasanKepribadian}
                </p>
              </section>
            )}

            {/* Kekuatan Utama */}
            {personalStrengths.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Kekuatan Utama Anda
                </h3>
                <ul className="space-y-2">
                  {personalStrengths.map((strength, i) => (
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
            {personalGrowthAreas.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Area Pengembangan Diri
                </h3>
                <ul className="space-y-2">
                  {personalGrowthAreas.map((area, i) => (
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
            {personalCareerRecommendations.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Rekomendasi Karir Spesifik
                </h3>
                <div className="grid gap-4">
                  {personalCareerRecommendations.map((career, i) => (
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
            {personalStrategies.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Strategi Pengembangan Diri
                </h3>
                <div className="space-y-4">
                  {personalStrategies.map((strategy, i) => (
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
            {personalTips.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Tips Praktis Sehari-hari
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {personalTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <span className="text-yellow-500 text-lg">OK</span>
                      <span className="text-gray-700 text-sm">{tip}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Motivational Message */}
            {personalInsights.motivationalMessage && (
              <section className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-lg border-2 border-yellow-400">
                <h3 className="text-lg font-bold text-gray-900 mb-3 text-center flex items-center justify-center gap-2">
                  Pesan Motivasi untuk Anda
                </h3>
                <p className="text-gray-800 text-center leading-relaxed italic text-lg">
                  "{personalInsights.motivationalMessage}"
                </p>
              </section>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              Analisis personal ini disusun dari hasil jawaban Newme Test premium yang sesuai dengan profil Anda.
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
                <span className="text-green-500">OK</span> Rekomendasi karir berdasarkan kepribadian
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">OK</span> Strategi pengembangan diri konkret
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
            <p className="text-xs text-gray-500">Mulai Rp 100.000 untuk analisis personal lengkap dan akses premium</p>
          </div>
        </div>
      )}
    </div>
  );
}
