// @ts-nocheck
import React from 'react';
import OfficialCertificateRenderer from './OfficialCertificateRenderer';

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
  issuedAt,
  certType = 'individu',
  identityLabel = 'ID',
  identityValue = '',
  lockPremiumSections = false,
}) {
  const resolvedTemplate = template && Object.keys(template).length ? template : (result?.template || {});
  const resolvedCertType = inferCertType({
    certType,
    template: resolvedTemplate,
    result,
  });

  return (
    <OfficialCertificateRenderer
      template={resolvedTemplate}
      certType={resolvedCertType}
      recipientName={result?.userName || 'Peserta NEWME'}
      certificateNumber={certificateNumber || resultId || result?.resultId || result?.id}
      identityLabel={identityLabel}
      identityValue={identityValue}
      issuedAt={issuedAt || result?.createdAt}
      result={result}
      lockPremiumSections={lockPremiumSections}
    />
  );
}
