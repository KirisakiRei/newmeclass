// @ts-nocheck
import React from 'react';
import OfficialCertificateRenderer from './OfficialCertificateRenderer';

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
  return (
    <OfficialCertificateRenderer
      template={template && Object.keys(template).length ? template : (result?.template || {})}
      certType={certType}
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
