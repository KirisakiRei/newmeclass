// @ts-nocheck
import React from 'react';

const ELEMENT_COLORS = {
  KAYU: '#3E9A57',
  API: '#E8702A',
  TANAH: '#C99A2B',
  LOGAM: '#7C7C87',
  AIR: '#2F7FD4',
};

const SOCIAL_LABELS = {
  e: 'EXTROVERT',
  i: 'INTROVERT',
  a: 'AMBIVERT',
};

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);
const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const stripCodeModifier = (value) => String(value || '').trim().replace(/\((\+|-|#)\)\s*$/, '');
const getCodeModifier = (value) => {
  const match = String(value || '').trim().match(/\((\+|-|#)\)\s*$/);
  return match ? match[1] : '';
};

const joinLine = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' - ');
  }
  return typeof value === 'string' ? value : '';
};

const formatObjectLine = (value) => {
  const source = asObject(value);
  return Object.entries(source)
    .map(([key, entry]) => `${key.replace(/([A-Z])/g, ' $1').trim()} : ${entry}`)
    .join(' - ');
};

const formatLegacyStrategyLine = (value) => {
  const entries = asArray(value)
    .map((item) => {
      const source = asObject(item);
      const area = String(source.area || '').trim();
      const steps = asArray(source.langkahKonkret).filter(Boolean).join(', ');
      if (!area && !steps) return '';
      return area && steps ? `${area} : ${steps}` : area || steps;
    })
    .filter(Boolean);

  return entries.join(' - ');
};

const collectCareerLines = (value) =>
  asArray(value)
    .map((item) => {
      if (typeof item === 'string') return item;
      const source = asObject(item);
      return source.bidang || source.alasan || '';
    })
    .filter(Boolean);

const toDateLabel = (value) => new Date(value || new Date()).toLocaleDateString('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const buildTopElements = (scores) => {
  const normalized = Object.entries(asObject(scores))
    .map(([element, raw]) => {
      const key = String(element || '').trim().toUpperCase();
      return {
        key,
        percentage: asNumber(raw?.percentage ?? raw),
      };
    })
    .filter((item) => item.key && item.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  while (normalized.length < 3) {
    normalized.push({ key: '', percentage: 0 });
  }

  return normalized;
};

const buildCoreDominantRanks = (coreScoring) => {
  const source = asObject(coreScoring);
  const ranks = [
    {
      key: String(source.dominan_1_elemen || '').trim().toUpperCase(),
      percentage: asNumber(source.dominan_1_persentase),
    },
    {
      key: String(source.dominan_2_elemen || '').trim().toUpperCase(),
      percentage: asNumber(source.dominan_2_persentase),
    },
    {
      key: String(source.dominan_3_elemen || '').trim().toUpperCase(),
      percentage: asNumber(source.dominan_3_persentase),
    },
  ].filter((item) => item.key);

  while (ranks.length < 3) {
    ranks.push({ key: '', percentage: 0 });
  }

  return ranks;
};

const buildPersonalityWord = (code, personalityType) => {
  const socialCode = String(code || '').trim().charAt(0).toLowerCase();
  const socialWord = SOCIAL_LABELS[socialCode] || String(personalityType || '').split(' ')[0].toUpperCase() || 'AMBIVERT';
  if (!socialWord) return '-';
  return `${socialCode || socialWord.charAt(0).toLowerCase()}${socialWord.slice(1)}`;
};

const buildRendererData = ({ result, personalityData }) => {
  if (personalityData && Object.keys(asObject(personalityData)).length > 0) {
    const source = asObject(personalityData);
    return {
      code: source.code || result?.personalityCode || 'aA',
      personalityType: source.personalityType || source.personalityLabel || result?.displayAnalysis?.personalityType || 'AMBIVERT',
      personalityLabel: source.personalityLabel || source.personalityType || result?.displayAnalysis?.personalityType || 'AMBIVERT',
      elementDescription: joinLine(source.elementDescription),
      karakter: joinLine(source.karakter),
      kekuatanJatidiri: asObject(source.kekuatanJatidiri),
      kompilasiAdaptasi: formatObjectLine(source.kompilasiAdaptasi),
      ciriKhas: joinLine(source.ciriKhas),
      profession: joinLine(source.rekomendasiKarir || source.dibutuhkanPadaProfesi),
      elementScores: buildTopElements(source.elementScores),
      dominantRanks: buildTopElements(source.elementScores),
      dominantElement: source.dominantElement || result?.dominantElement || '',
    };
  }

  const analysis = asObject(result?.analysis);
  const displayAnalysis = asObject(result?.displayAnalysis);
  const insights = asObject(analysis.insights);
  const personalInsights = asObject(analysis.personalInsights || analysis.aiInsights);
  const coreScoring = asObject(result?.coreScoring || analysis.coreScoring);
  const legacyStrategies = formatLegacyStrategyLine(personalInsights.strategiPengembanganDiri);
  const legacyCareerLines = collectCareerLines(personalInsights.rekomendasiKarirSpesifik);
  const elementScores = buildTopElements(analysis.elementScores || displayAnalysis.elementScores);

  return {
    code: insights.code || result?.personalityCode || 'aA',
    personalityType: analysis.personalityType || displayAnalysis.personalityType || 'AMBIVERT',
    personalityLabel: insights.personalityLabel || analysis.personalityType || displayAnalysis.personalityType || 'AMBIVERT',
    elementDescription: joinLine(insights.elementDescription) || String(personalInsights.ringkasanKepribadian || displayAnalysis.summary || ''),
    karakter: joinLine(insights.karakter) || joinLine(personalInsights.tipsPraktis),
    kekuatanJatidiri: asObject(insights.kekuatanJatidiri),
    kompilasiAdaptasi: formatObjectLine(insights.kompilasiAdaptasi) || legacyStrategies,
    ciriKhas: joinLine(insights.ciriKhas) || joinLine(personalInsights.tipsPraktis),
    profession:
      joinLine(insights.dibutuhkanPadaProfesi || insights.rekomendasiKarir)
      || legacyCareerLines.join(' - '),
    elementScores,
    dominantRanks: Object.keys(coreScoring).length > 0 ? buildCoreDominantRanks(coreScoring) : elementScores,
    dominantElement: analysis.dominantElement || result?.dominantElement || '',
  };
};

const DotCluster = ({ className = '', rows = 4, cols = 7 }) => (
  <div className={`grid gap-3 ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
    {Array.from({ length: rows * cols }).map((_, index) => (
      <span key={index} className="h-2.5 w-2.5 rounded-full bg-[#D4A017] opacity-80" />
    ))}
  </div>
);

const LogoMark = ({ src, alt, fallback, showPlaceholder = false, className = '', circleClassName = '' }) => {
  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }

  if (!showPlaceholder) return null;

  return (
    <div className={`flex items-center justify-center rounded-full border border-[#D4A017]/40 bg-white/80 text-[#4B4B4B] ${circleClassName}`}>
      <span className="text-xs font-semibold tracking-[0.24em]">{fallback}</span>
    </div>
  );
};

const FauxQr = () => (
  <div className="grid h-[78px] w-[78px] grid-cols-7 gap-[2px] rounded-[10px] border-4 border-black bg-white p-[4px]">
    {[
      1,1,1,0,1,1,1,
      1,0,1,0,1,0,1,
      1,1,1,0,1,1,1,
      0,0,1,1,0,0,1,
      1,1,0,1,0,1,0,
      1,0,1,0,1,0,1,
      1,1,1,0,1,1,1,
    ].map((cell, index) => (
      <span key={index} className={cell ? 'rounded-[1px] bg-black' : 'rounded-[1px] bg-white'} />
    ))}
  </div>
);

const LockGlyph = ({ className = 'h-4 w-4 text-[#8B6A09]' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    <circle cx="12" cy="16" r="1.2" />
  </svg>
);

const LockedBlurPanel = ({ children, className = '' }) => (
  <div className={`relative mt-1.5 min-w-0 ${className}`}>
    <div className="pointer-events-none absolute right-0 top-0 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#D4A017]/35 bg-white/96">
      <LockGlyph className="h-3.5 w-3.5 text-[#8B6A09]" />
    </div>
    <div className="min-w-0 select-none pr-10 blur-[3.2px] opacity-70">
      {children}
    </div>
  </div>
);

const LockedLine = ({ width = '100%', className = '' }) => (
  <div className={`h-[8px] rounded-full bg-[#DCCB8A] ${className}`} style={{ width }} />
);

const LockedSection = ({ title, lines = ['92%', '72%'] }) => (
  <section className="border-l-2 border-[#E2C55D] pl-5">
    <h2 className="text-[18px] font-semibold leading-tight text-[#333333]" style={{ fontFamily: 'var(--font-certificate-display)' }}>
      {title}
    </h2>
    <LockedBlurPanel>
      <div className="space-y-2.5">
        {lines.map((width, index) => (
          <LockedLine key={`${title}-${width}-${index}`} width={width} />
        ))}
      </div>
    </LockedBlurPanel>
  </section>
);

const LockedCodePanel = () => (
  <LockedBlurPanel className="mx-auto w-[128px]">
    <div className="flex min-h-[98px] items-center justify-center text-[68px] font-bold leading-none tracking-[0.03em] text-[#B89B3D]" style={{ fontFamily: 'var(--font-certificate-display)' }}>
      (aA)
    </div>
  </LockedBlurPanel>
);

const LockedIdentityPanel = ({ rows = ['Dominan I', 'Dominan II', 'Dominan III'] }) => (
  <LockedBlurPanel>
    <div className="space-y-1.5">
      {rows.map((label, index) => (
        <div key={`${label}-${index}`} className="grid grid-cols-[96px_1fr_34px] items-center gap-3 text-[14px] text-[#3B3B3B]">
          <span className="font-semibold">{label}</span>
          <LockedLine width={`${88 - (index * 10)}%`} />
          <span className="justify-self-end font-semibold">21%</span>
        </div>
      ))}
    </div>
  </LockedBlurPanel>
);

export default function OfficialCertificateRenderer({
  template = {},
  result = null,
  personalityData = null,
  recipientName = 'NAMA PENERIMA',
  certificateNumber = 'NEWME-000000',
  identityLabel = 'ID',
  identityValue = '',
  issuedAt = null,
  certType = 'individu',
  showPlaceholders = false,
  className = '',
  lockPremiumSections = false,
}) {
  const resolvedTemplate = asObject(template);
  const rendererData = buildRendererData({ result, personalityData });
  const isYayasan = String(certType || '').toLowerCase() === 'yayasan';
  const code = String(rendererData.code || 'aA');
  const baseCode = stripCodeModifier(code);
  const codeModifier = getCodeModifier(code);
  const accentColor = resolvedTemplate.accentColor || (isYayasan ? '#B8860B' : '#D4A017');
  const displayWord = buildPersonalityWord(code, rendererData.personalityType);
  const brandLogoUrl = resolvedTemplate.brandLogoUrl || '/logo.png';
  const secondaryLogoUrl = isYayasan ? (resolvedTemplate.secondaryLogoUrl || resolvedTemplate.logoUrl || null) : null;
  const backgroundTextureUrl = resolvedTemplate.backgroundTextureUrl || resolvedTemplate.backgroundUrl || null;
  const productionBadgeUrl = resolvedTemplate.productionBadgeUrl || null;
  const signatureUrl = resolvedTemplate.signatureUrl || null;
  const signerName = resolvedTemplate.signerName || 'LIS SUDIBYO, ST';
  const signerTitle = resolvedTemplate.signerTitle || 'Chairman, R & B Development';
  const titleText = resolvedTemplate.titleText || 'SERTIFIKAT';
  const subtitleText = resolvedTemplate.subtitleText || 'ANALISA KEPRIBADIAN & JATIDIRI';
  const issueDate = toDateLabel(issuedAt || result?.createdAt || new Date());
  const topElements = rendererData.dominantRanks || rendererData.elementScores;
  const selfStrength = rendererData.kekuatanJatidiri;
  const baseBackground = isYayasan
    ? 'radial-gradient(circle at top, rgba(255,255,255,0.99), rgba(250,246,236,0.98) 28%, rgba(255,255,255,0.98) 62%, rgba(246,238,219,0.92) 100%)'
    : 'radial-gradient(circle at top, rgba(255,255,255,0.98), rgba(244,244,244,0.92) 40%, rgba(255,255,255,0.98) 100%)';
  const participantName = String(recipientName || 'NAMA PESERTA').trim() || 'NAMA PESERTA';
  const displayIdentityValue = String(identityValue || certificateNumber || 'NMC-2026-XXXXX').trim() || 'NMC-2026-XXXXX';
  const productionBadge = productionBadgeUrl ? (
    <img src={productionBadgeUrl} alt="Production Badge" className="h-12 w-12 rounded-full object-cover" />
  ) : (
    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#D4A017]/80 bg-[#1E1E1E] text-[12px] font-semibold tracking-[0.18em] text-[#D4A017]">
      MSE
    </div>
  );

  return (
    <div
      className={`relative mx-auto w-[1120px] min-w-[1120px] overflow-hidden bg-white shadow-2xl print:h-[210mm] print:w-[297mm] print:min-w-0 print:shadow-none ${className}`}
      style={{
        aspectRatio: '297 / 210',
        fontFamily: 'var(--font-certificate-body)',
        color: '#2E2E2E',
        background: baseBackground,
      }}
      data-testid="official-certificate-renderer"
    >
      {backgroundTextureUrl && (
        <img
          src={backgroundTextureUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12]"
        />
      )}
      {isYayasan ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,160,23,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(186,134,11,0.10),transparent_28%)]" />
          <div className="pointer-events-none absolute left-[78px] top-[86px] h-[1px] w-[320px] bg-gradient-to-r from-transparent via-[#D4A017]/60 to-transparent" />
          <div className="pointer-events-none absolute bottom-[92px] right-[120px] h-[1px] w-[250px] bg-gradient-to-r from-transparent via-[#D4A017]/55 to-transparent" />
        </>
      ) : null}

      <div className="pointer-events-none absolute left-0 top-0 h-32 w-44 overflow-hidden">
        <div className="absolute -left-16 top-0 h-32 w-44 rotate-[-38deg] bg-[#2A2A2A]" />
        <div className="absolute -left-1 top-2 h-28 w-3 rotate-[-38deg] bg-[#D4A017]" />
        {isYayasan ? <div className="absolute left-[24px] top-[-12px] h-36 w-[2px] rotate-[-38deg] bg-[#F0C95E]/80" /> : null}
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-56 overflow-hidden">
        <div className="absolute bottom-0 right-[-60px] h-32 w-56 rotate-[-37deg] bg-[#2A2A2A]" />
        <div className="absolute bottom-0 right-[24px] h-32 w-3 rotate-[-37deg] bg-[#D4A017]" />
        {isYayasan ? <div className="absolute bottom-0 right-[48px] h-32 w-[2px] rotate-[-37deg] bg-[#F0C95E]/80" /> : null}
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-16 bg-[#D4A017]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />

      <DotCluster className="pointer-events-none absolute left-[190px] top-[18px]" rows={3} cols={6} />
      <DotCluster className="pointer-events-none absolute bottom-[16px] left-[585px]" rows={3} cols={4} />
      <DotCluster className="pointer-events-none absolute bottom-[72px] right-[14px]" rows={3} cols={2} />
      {isYayasan ? <DotCluster className="pointer-events-none absolute right-[170px] top-[22px]" rows={2} cols={4} /> : null}

      <div className="relative z-10 flex h-full flex-col px-14 pb-6 pt-6 print:px-12 print:pb-5 print:pt-5">
        <div className="grid grid-cols-[0.92fr_0.8fr_1.28fr] items-start gap-6">
          <div />
          <div className="flex items-center justify-start gap-4 pl-6 pt-2">
            <LogoMark
              src={secondaryLogoUrl}
              alt="Secondary Logo"
              fallback="YAYASAN"
              showPlaceholder={showPlaceholders && isYayasan}
              className="h-[72px] w-[72px] object-contain"
              circleClassName="h-[72px] w-[72px]"
            />
            <LogoMark
              src={brandLogoUrl}
              alt="NEWME Logo"
              fallback="NEWME"
              showPlaceholder
              className="h-[82px] w-[82px] object-contain"
              circleClassName="h-[82px] w-[82px]"
            />
          </div>
          <div className="pt-1 text-right">
            <h1
              className="text-[62px] font-semibold uppercase leading-[0.88] tracking-[0.18em] text-[#262626]"
              style={{ fontFamily: 'var(--font-certificate-display)' }}
            >
              {titleText}
            </h1>
            <p className="mt-2 text-[22px] font-semibold uppercase tracking-[0.03em] text-[#2E2E2E]">
              {subtitleText}
            </p>
            <div className="mt-2 flex items-center justify-end gap-3 text-[18px] text-[#3B3B3B]">
              <span style={{ fontFamily: 'var(--font-certificate-display)' }}>{identityLabel}</span>
              <div className="min-w-[300px] border-b border-dotted border-[#7D7D7D] pb-1 text-center text-[13px] font-semibold tracking-[0.12em] text-[#3E3E3E]">
                {displayIdentityValue}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid flex-1 grid-cols-[1.03fr_0.97fr] gap-8">
          <div className="space-y-4 pr-1">
            <section className="border-l-2 border-[#E2C55D] pl-5">
              <h2 className="text-[18px] font-semibold leading-tight text-[#333333]" style={{ fontFamily: 'var(--font-certificate-display)' }}>
                Kepribadian :
              </h2>
              <p className="mt-1.5 whitespace-pre-line text-[15px] leading-[1.48] text-[#3B3B3B]">
                {rendererData.elementDescription || '-'}
              </p>
            </section>

            {lockPremiumSections ? (
              <>
                <LockedSection title="+/- Karakter :" />
                <LockedSection title="Kekuatan Jatidiri :" />
                <LockedSection title="Kompilasi Adaptasi :" />
              </>
            ) : (
              <>
                <section className="border-l-2 border-[#E2C55D] pl-5">
                  <h2 className="text-[18px] font-semibold leading-tight text-[#333333]" style={{ fontFamily: 'var(--font-certificate-display)' }}>
                    +/- Karakter :
                  </h2>
                  <p className="mt-1.5 whitespace-pre-line text-[15px] leading-[1.48] text-[#3B3B3B]">
                    {rendererData.karakter || '-'}
                  </p>
                </section>

                <section className="border-l-2 border-[#E2C55D] pl-5">
                  <h2 className="text-[18px] font-semibold leading-tight text-[#333333]" style={{ fontFamily: 'var(--font-certificate-display)' }}>
                    Kekuatan Jatidiri:
                    {' '}
                    <span className="font-bold text-[#2C2C2C]">
                      {selfStrength.tipe || '-'}
                    </span>
                  </h2>
                  <p className="mt-1.5 text-[15px] leading-[1.5] text-[#3B3B3B]">
                    Kehidupan : {selfStrength.kehidupan || '-'}
                    {' - '}
                    Kesehatan : {selfStrength.kesehatan || '-'}
                  </p>
                  <p className="mt-1 text-[15px] leading-[1.5] text-[#3B3B3B]">
                    Kontribusi : {selfStrength.kontribusi || '-'}
                    {' - '}
                    Kekhasan : {selfStrength.kekhasan || '-'}
                    {' - '}
                    Kharisma : {selfStrength.kharisma || '-'}
                  </p>
                </section>

                <section className="border-l-2 border-[#E2C55D] pl-5">
                  <h2 className="text-[18px] font-semibold leading-tight text-[#333333]" style={{ fontFamily: 'var(--font-certificate-display)' }}>
                    Kompilasi Adaptasi :
                  </h2>
                  <p className="mt-1.5 whitespace-pre-line text-[14px] leading-[1.48] text-[#3B3B3B]">
                    {rendererData.kompilasiAdaptasi || '-'}
                  </p>
                </section>
              </>
            )}
          </div>

          <div className="relative flex h-full min-h-0 flex-col pl-2">
            <div className="mx-auto flex max-w-[475px] justify-center">
              <div className="w-full">
                <p
                  className="text-center text-[18px] font-semibold text-[#373737]"
                  style={{ fontFamily: 'var(--font-certificate-display)' }}
                >
                  Optimalkan versi terbaik_mu
                </p>
                <div className="relative mt-2 h-[52px] rounded-full bg-[#DDDDDD] px-10">
                  <div
                    className="flex h-full items-center justify-center text-center text-[20px] font-bold tracking-[0.01em] text-[#E0B940]"
                    style={{
                      fontFamily: 'var(--font-certificate-display)',
                      WebkitTextStroke: '1px #8B6A09',
                      textShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    }}
                  >
                    {participantName}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border-l-2 border-[#E2C55D] pl-5">
                <div className="grid grid-cols-[212px_1fr] gap-5">
                  <div className="pt-1 text-center">
                  {lockPremiumSections ? (
                    <LockedCodePanel />
                  ) : (
                    <div className="flex min-h-[104px] items-start justify-center">
                      <div className="inline-flex items-start gap-3 whitespace-nowrap">
                        <div
                          className="text-[74px] font-bold leading-none tracking-[0.03em] text-[#E0B940]"
                          style={{
                            fontFamily: 'var(--font-certificate-display)',
                            WebkitTextStroke: '1.6px #8B6A09',
                            textShadow: '0 3px 10px rgba(0,0,0,0.12)',
                          }}
                        >
                          ({baseCode || 'aA'})
                        </div>
                        {codeModifier ? (
                          <span
                            className="mt-3 flex h-[30px] min-w-[42px] items-center justify-center rounded-[6px] border border-[#8B6A09]/35 bg-white/96 px-2 text-[16px] font-bold leading-none text-[#B8860B] shadow-sm"
                            style={{ fontFamily: 'var(--font-certificate-display)' }}
                          >
                            ({codeModifier})
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-end gap-2 text-[18px] text-[#333333]">
                    <span className="font-semibold" style={{ fontFamily: 'var(--font-certificate-display)' }}>Kepribadian :</span>
                    {lockPremiumSections ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className="select-none text-[20px] font-bold blur-[3px] opacity-75"
                          style={{
                            color: accentColor,
                            fontFamily: 'var(--font-certificate-display)',
                            WebkitTextStroke: '1px #8B6A09',
                          }}
                        >
                          {displayWord}
                        </span>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D4A017]/35 bg-white/96">
                          <LockGlyph className="h-3 w-3 text-[#8B6A09]" />
                        </span>
                      </div>
                    ) : (
                      <span
                        className="text-[20px] font-bold"
                        style={{
                          color: accentColor,
                          fontFamily: 'var(--font-certificate-display)',
                          WebkitTextStroke: '1px #8B6A09',
                        }}
                      >
                        {displayWord}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-[18px] font-semibold text-[#333333]" style={{ fontFamily: 'var(--font-certificate-display)' }}>
                      Simbol Jatidiri :
                    </p>
                    {lockPremiumSections ? (
                      <LockedIdentityPanel />
                    ) : (
                      <div className="mt-1.5 space-y-1">
                        {topElements.map((item, index) => (
                          <div key={`${item.key || 'empty'}-${index}`} className="grid grid-cols-[112px_1fr_42px] items-baseline gap-3 text-[15px] leading-tight text-[#343434]">
                            <span className="font-semibold">Dominan {['I', 'II', 'III'][index]}</span>
                            <span
                              className="font-bold tracking-[0.04em]"
                              style={{
                                color: item.key ? (ELEMENT_COLORS[item.key] || '#8B6A09') : '#B8A45A',
                                fontFamily: 'var(--font-certificate-display)',
                                WebkitTextStroke: item.key ? '0.6px #8B6A09' : '0',
                              }}
                            >
                              {item.key || '.'}
                            </span>
                            <span className="justify-self-end">{item.key ? `${item.percentage}%` : '. %'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {lockPremiumSections ? (
                <>
                  <div className="mt-3">
                    <LockedSection title="Ciri khas :" lines={['94%', '80%']} />
                  </div>
                  <div className="mt-3">
                    <LockedSection title="Dibutuhkan pada profesi :" lines={['96%']} />
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-3">
                    <h2 className="text-[18px] font-semibold leading-tight text-[#333333]" style={{ fontFamily: 'var(--font-certificate-display)' }}>
                      Ciri khas :
                    </h2>
                    <p className="mt-1.5 text-[15px] leading-[1.48] text-[#3B3B3B]">
                      {rendererData.ciriKhas || '-'}
                    </p>
                  </div>

                  <div className="mt-3">
                    <h2 className="text-[18px] font-semibold leading-tight text-[#333333]" style={{ fontFamily: 'var(--font-certificate-display)' }}>
                      Dibutuhkan pada profesi :
                    </h2>
                    <p className="mt-1.5 text-[15px] leading-[1.48] text-[#3B3B3B]">
                      {rendererData.profession || '-'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-auto flex items-end gap-3 pl-5 pt-4">
              <img src={brandLogoUrl} alt="NEWME Logo" className="h-[56px] w-[56px] object-contain" />
              <FauxQr />
              <div className="pb-1">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Tanda tangan" className="mb-1 h-[44px] max-w-[160px] object-contain object-left" />
                ) : null}
                <div className="border-b-2 border-[#2F2F2F] pb-1 text-[16px] font-semibold uppercase tracking-[0.02em] text-[#2C2C2C]">
                  {signerName}
                </div>
                <p
                  className="mt-1 text-[13px] font-semibold text-[#D4A017]"
                  style={{ fontFamily: 'var(--font-certificate-display)' }}
                >
                  {signerTitle}
                </p>
                <p className="mt-1.5 text-[10px] tracking-[0.04em] text-[#5A5A5A]">Diterbitkan {issueDate}</p>
              </div>
            </div>

            <div className="absolute bottom-0 right-0 flex items-end gap-2">
              <span
                className="mb-1.5 text-[14px] italic text-white/85"
                style={{ fontFamily: 'var(--font-certificate-display)' }}
              >
                Production by
              </span>
              {productionBadge}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
