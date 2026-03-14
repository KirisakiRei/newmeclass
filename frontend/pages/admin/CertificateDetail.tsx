// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Calendar, User, BookOpen, Hash } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { certificatesAPI } from '../../services/api';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner from '../../components/ui/loading-spinner';
import CertificatePreview from '../../components/admin/CertificatePreview';

const CertificateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCert = async () => {
      try {
        const certRes = await certificatesAPI.getById(id);
        const certData = certRes.data;
        setCert(certData);

        const tplRes = await certificatesAPI.getTemplate(certData.certType || 'individu');
        setTemplate(tplRes.data || {});
      } catch (error) {
        console.error('Error loading certificate:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCert();
  }, [id]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat sertifikat..." className="min-h-[60vh]" />;
  }

  if (!cert) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Sertifikat tidak ditemukan</p>
        <Button onClick={() => navigate('/admin/certificates')} className="mt-4 bg-yellow-400 text-black hover:bg-yellow-500">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  const isVip = cert.certType === 'yayasan';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/certificates')}
          className="border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
        </Button>
        <PageHeader icon={Award} title="Detail Sertifikat" description={cert.certificateNumber} />
      </div>

      {/* Certificate Preview (read-only) */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20 mb-6">
        <CardContent className="p-6">
          <CertificatePreview
            template={template || {}}
            certType={cert.certType || 'individu'}
            recipientName={cert.userName || 'Nama Penerima'}
            courseName={cert.courseName || 'Program'}
            certificateNumber={cert.certificateNumber}
            date={new Date(cert.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            personalityData={cert.personalityData}
            editable={false}
          />
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardContent className="p-6">
          <h3 className="text-white font-semibold mb-4">Informasi Sertifikat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-lg">
              <Hash className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">Nomor Sertifikat</p>
                <p className="text-yellow-400 font-mono text-sm">{cert.certificateNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-lg">
              <User className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">Penerima</p>
                <p className="text-white text-sm">{cert.userName || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-lg">
              <BookOpen className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">Program</p>
                <p className="text-white text-sm">{cert.courseName || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-lg">
              <Award className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">Tipe</p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                  isVip ? 'bg-purple-400/20 text-purple-400' : 'bg-blue-400/20 text-blue-400'
                }`}>
                  {isVip ? 'Yayasan VIP' : 'Individu'}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">Tanggal Terbit</p>
                <p className="text-white text-sm">{new Date(cert.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            {cert.personalityType && (
              <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                <Award className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Tipe Kepribadian</p>
                  <p className="text-white text-sm font-semibold">{cert.personalityType}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CertificateDetail;
