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
}) {
  return (
    <OfficialCertificateRenderer
      template={template}
      certType={certType}
      recipientName={result?.userName || 'Peserta NEWME'}
      certificateNumber={certificateNumber || resultId || result?.resultId || result?.id}
      issuedAt={issuedAt || result?.createdAt}
      result={result}
    />
  );
}
