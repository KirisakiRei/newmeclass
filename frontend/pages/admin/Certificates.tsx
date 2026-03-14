// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Upload, Save, Users, FileText, Building2, User, Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';
import { certificatesAPI, usersAPI } from '../../services/api';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner from '../../components/ui/loading-spinner';
import CertificatePreview from '../../components/admin/CertificatePreview';

const CERT_TYPES = [
  { id: 'individu', label: 'Individu', icon: User, description: 'Sertifikat standar untuk pengguna individual' },
  { id: 'yayasan', label: 'Yayasan VIP', icon: Building2, description: 'Sertifikat premium untuk pengguna via yayasan' },
];

const createEmptyTemplate = (type) => ({
  certType: type,
  titleText: type === 'yayasan' ? 'SERTIFIKAT VIP' : 'SERTIFIKAT',
  subtitleText: '',
  completionText: '',
  signerName: '',
  signerTitle: '',
  textColor: '#000000',
  accentColor: type === 'yayasan' ? '#FFD700' : '#1a1a1a',
  backgroundUrl: null,
  logoUrl: '/logo.png',
  signatureUrl: null,
  organization: '',
  layoutPositions: {
    logo: { x: 50, y: 8, width: type === 'yayasan' ? 14 : 12 },
    signature: { x: 50, y: 75, width: type === 'yayasan' ? 11 : 10 },
  },
});

const Certificates = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuedCerts, setIssuedCerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('template');
  const [certType, setCertType] = useState('individu');
  const [issueForm, setIssueForm] = useState({ userId: '', courseName: '', certType: 'individu' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templateRes, certsRes, usersRes] = await Promise.all([
        certificatesAPI.getTemplate(certType),
        certificatesAPI.getIssued(),
        usersAPI.getAll()
      ]);
      setTemplate(templateRes.data || createEmptyTemplate(certType));
      setIssuedCerts(Array.isArray(certsRes.data) ? certsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload template when cert type changes
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const res = await certificatesAPI.getTemplate(certType);
        setTemplate(res.data || createEmptyTemplate(certType));
      } catch (error) {
        setTemplate(createEmptyTemplate(certType));
      }
    };
    if (!loading) loadTemplate();
  }, [certType]);

  const handleLayoutChange = (positions) => {
    setTemplate(prev => ({ ...prev, layoutPositions: positions }));
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      await certificatesAPI.updateTemplate({
        ...template,
        certType,
      });
      toast({ title: 'Sukses', description: `Template ${certType === 'yayasan' ? 'Yayasan VIP' : 'Individu'} berhasil disimpan` });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAsset = async (assetType, file) => {
    try {
      const response = await certificatesAPI.uploadAsset(assetType, file);
      setTemplate({ ...template, [`${assetType}Url`]: response.data.url });
      toast({ title: 'Sukses', description: `${assetType} berhasil diupload` });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal upload file', variant: 'destructive' });
    }
  };

  const handleIssueCertificate = async (e) => {
    e.preventDefault();
    try {
      const response = await certificatesAPI.issue({
        userId: issueForm.userId,
        courseName: issueForm.courseName,
        certType: issueForm.certType,
      });
      toast({ title: 'Sukses', description: `Sertifikat diterbitkan: ${response.data.certificateNumber}` });
      setIssueForm({ userId: '', courseName: '', certType: 'individu' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menerbitkan sertifikat', variant: 'destructive' });
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat sertifikat..." className="min-h-[60vh]" />;
  }

  return (
    <div>
      <PageHeader icon={Award} title="Certificates" description="Kelola template dan penerbitan sertifikat" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'template' ? 'default' : 'outline'}
          onClick={() => setActiveTab('template')}
          className={activeTab === 'template' ? 'bg-yellow-400 text-black' : 'border-yellow-400/50 text-yellow-400'}
        >
          <FileText className="w-4 h-4 mr-2" /> Template
        </Button>
        <Button
          variant={activeTab === 'issue' ? 'default' : 'outline'}
          onClick={() => setActiveTab('issue')}
          className={activeTab === 'issue' ? 'bg-yellow-400 text-black' : 'border-yellow-400/50 text-yellow-400'}
        >
          <Award className="w-4 h-4 mr-2" /> Terbitkan
        </Button>
        <Button
          variant={activeTab === 'issued' ? 'default' : 'outline'}
          onClick={() => setActiveTab('issued')}
          className={activeTab === 'issued' ? 'bg-yellow-400 text-black' : 'border-yellow-400/50 text-yellow-400'}
        >
          <Users className="w-4 h-4 mr-2" /> Diterbitkan ({issuedCerts.length})
        </Button>
      </div>

      {/* Template Tab */}
      {activeTab === 'template' && template && (
        <div className="space-y-6">
          {/* Cert Type Selector */}
          <div className="flex gap-3">
            {CERT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setCertType(type.id)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all text-left ${
                    certType === type.id ?
                       'border-yellow-400 bg-yellow-400/10'
                      : 'border-yellow-400/20 bg-[#2a2a2a] hover:border-yellow-400/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${certType === type.id ? 'text-yellow-400' : 'text-gray-400'}`} />
                    <div>
                      <p className={`font-semibold ${certType === type.id ? 'text-yellow-400' : 'text-white'}`}>{type.label}</p>
                      <p className="text-gray-400 text-xs">{type.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Certificate Preview */}
          <Card className="bg-[#2a2a2a] border-yellow-400/20">
            <CardHeader>
              <CardTitle className="text-white">Preview Sertifikat</CardTitle>
            </CardHeader>
            <CardContent>
              <CertificatePreview
                template={template}
                certType={certType}
                recipientName="NAMA PENERIMA"
                courseName={template.subtitleText || 'Program Sertifikasi'}
                certificateNumber="NMC-2026-XXXXX"
                editable={true}
                onLayoutChange={handleLayoutChange}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#2a2a2a] border-yellow-400/20">
            <CardHeader>
              <CardTitle className="text-white">Pengaturan Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Judul Sertifikat</label>
                <Input value={template.titleText || ''} onChange={(e) => setTemplate({ ...template, titleText: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Subtitle</label>
                <Input value={template.subtitleText || ''} onChange={(e) => setTemplate({ ...template, subtitleText: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Teks Penyelesaian</label>
                <Input value={template.completionText || ''} onChange={(e) => setTemplate({ ...template, completionText: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Nama Penandatangan</label>
                  <Input value={template.signerName || ''} onChange={(e) => setTemplate({ ...template, signerName: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Jabatan</label>
                  <Input value={template.signerTitle || ''} onChange={(e) => setTemplate({ ...template, signerTitle: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Warna Teks</label>
                  <Input type="color" value={template.textColor || '#000000'} onChange={(e) => setTemplate({ ...template, textColor: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 h-10" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Warna Aksen</label>
                  <Input type="color" value={template.accentColor || '#FFD700'} onChange={(e) => setTemplate({ ...template, accentColor: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 h-10" />
                </div>
              </div>
              <Button onClick={handleSaveTemplate} disabled={saving} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Menyimpan...' : 'Simpan Template'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#2a2a2a] border-yellow-400/20">
            <CardHeader>
              <CardTitle className="text-white">Upload Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Background Sertifikat</label>
                <div className="flex gap-2 mt-1">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleUploadAsset('background', e.target.files[0])} className="flex-1 text-gray-400 text-sm" />
                </div>
                {template.backgroundUrl && <img src={template.backgroundUrl} alt="Background" className="mt-2 h-20 object-contain rounded" />}
              </div>
              <div>
                <label className="text-gray-400 text-sm">Logo</label>
                <div className="flex gap-2 mt-1">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleUploadAsset('logo', e.target.files[0])} className="flex-1 text-gray-400 text-sm" />
                </div>
                {template.logoUrl && (
                  <div className="mt-2">
                    <img src={template.logoUrl} alt="Logo" className="h-16 object-contain" />
                    {template.layoutPositions.logo && (
                      <p className="text-xs text-gray-500 mt-1">Posisi: x={Math.round(template.layoutPositions.logo.x)}% y={Math.round(template.layoutPositions.logo.y)}%</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-gray-400 text-sm">Tanda Tangan</label>
                <div className="flex gap-2 mt-1">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleUploadAsset('signature', e.target.files[0])} className="flex-1 text-gray-400 text-sm" />
                </div>
                {template.signatureUrl && (
                  <div className="mt-2">
                    <img src={template.signatureUrl} alt="Signature" className="h-12 object-contain" />
                    {template.layoutPositions.signature && (
                      <p className="text-xs text-gray-500 mt-1">Posisi: x={Math.round(template.layoutPositions.signature.x)}% y={Math.round(template.layoutPositions.signature.y)}%</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      )}

      {/* Issue Tab */}
      {activeTab === 'issue' && (
        <Card className="bg-[#2a2a2a] border-yellow-400/20 max-w-lg">
          <CardHeader>
            <CardTitle className="text-white">Terbitkan Sertifikat</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleIssueCertificate} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Tipe Sertifikat</label>
                <div className="flex gap-2 mt-1">
                  {CERT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setIssueForm({ ...issueForm, certType: type.id })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        issueForm.certType === type.id ?
                           'bg-yellow-400 text-[#1a1a1a]'
                          : 'bg-[#1a1a1a] text-gray-400 border border-yellow-400/20'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Pilih Pengguna</label>
                <select value={issueForm.userId} onChange={(e) => setIssueForm({ ...issueForm, userId: e.target.value })} required className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-md p-2 text-white">
                  <option value="">-- Pilih Pengguna --</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.fullName || user.name || 'Tanpa Nama'} ({user.email || '-'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Nama Kursus/Program</label>
                <Input value={issueForm.courseName} onChange={(e) => setIssueForm({ ...issueForm, courseName: e.target.value })} required placeholder="e.g., NEWME Test Level 1" className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
              </div>
              <Button type="submit" className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
                <Award className="w-4 h-4 mr-2" /> Terbitkan Sertifikat
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Issued Tab */}
      {activeTab === 'issued' && (
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1a1a1a]">
                  <tr>
                    <th className="text-left p-4 text-gray-400 text-sm">No. Sertifikat</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Nama</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Kursus</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Tipe</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Tanggal</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {issuedCerts.map((cert) => (
                    <tr key={cert._id} className="border-t border-yellow-400/10 hover:bg-yellow-400/5 transition-colors">
                      <td className="p-4 text-yellow-400 font-mono text-sm">{cert.certificateNumber}</td>
                      <td className="p-4 text-white">{cert.userName}</td>
                      <td className="p-4 text-gray-400">{cert.courseName}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          cert.certType === 'yayasan' ? 'bg-purple-400/20 text-purple-400' : 'bg-blue-400/20 text-blue-400'
                        }`}>
                          {cert.certType === 'yayasan' ? 'Yayasan VIP' : 'Individu'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{new Date(cert.issuedAt).toLocaleDateString('id-ID')}</td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/certificates/${cert._id}`)}
                          className="border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" /> Lihat
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {issuedCerts.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-400">Belum ada sertifikat yang diterbitkan</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Certificates;
