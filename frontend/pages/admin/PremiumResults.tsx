// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Search, Eye, Trophy, User, Brain, Star, Download, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner from '../../components/ui/loading-spinner';
import EmptyState from '../../components/ui/empty-state';
import { formatDateTime } from '../../lib/utils';
import Pagination from '../../components/ui/pagination';
import { createEmptyPageState, extractPaginatedResponse } from '../../lib/paginated-response';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getCsrfToken = () => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)nm_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};
const buildRequestConfig = (params = undefined) => ({
  withCredentials: true,
  params,
  headers: {
    ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken() } : {}),
  },
});
const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const extractPayload = (value) => (value && typeof value === 'object' && 'data' in value ? value.data : value);
const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const PremiumResults = () => {
  const { toast } = useToast();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(createEmptyPageState(10));

  useEffect(() => {
    loadResults();
    loadStats();
  }, [page, pageSize, searchTerm]);

  const loadResults = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/test-results/admin/premium-results`,
        buildRequestConfig({
          page,
          pageSize,
          search: searchTerm || undefined,
        }),
      );
      const nextPage = extractPaginatedResponse(response.data, pageSize);
      setResults(nextPage.items || []);
      setPagination(nextPage);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat hasil premium',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/test-results/admin/stats`, buildRequestConfig());
      setStats(extractPayload(response.data));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewDetail = async (result) => {
    setDetailLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/test-results/admin/premium-results/${result.userId}`,
        buildRequestConfig(),
      );
      setSelectedResult(extractPayload(response.data));
      setShowDetailDialog(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat detail hasil',
        variant: 'destructive'
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return formatDateTime(dateString);
  };

  const getElementColor = (element) => {
    const colors = {
      'KAYU': 'text-green-400 bg-green-400/20',
      'API': 'text-red-400 bg-red-400/20',
      'TANAH': 'text-yellow-400 bg-yellow-400/20',
      'LOGAM': 'text-gray-300 bg-gray-400/20',
      'AIR': 'text-blue-400 bg-blue-400/20'
    };
    return colors[element] || 'text-yellow-400 bg-yellow-400/20';
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat hasil premium..." className="min-h-[60vh]" />;
  }

  const selectedAnalysis = asObject(selectedResult?.displayAnalysis);
  const selectedCoreScoring = asObject(selectedResult?.coreScoring || selectedResult?.analysis?.coreScoring);
  const selectedStrengths = asArray(selectedAnalysis.strengths);
  const selectedAreasToImprove = asArray(selectedAnalysis.areasToImprove);
  const selectedCareerRecommendations = asArray(selectedAnalysis.careerRecommendations);
  const selectedLocation = [selectedResult?.userProvince, selectedResult?.userCity].filter(Boolean).join(', ') || '-';
  const selectedTitle = selectedResult?.userName || selectedResult?.userEmail || 'Pengguna Premium';
  const selectedDominantRanks = Object.keys(selectedCoreScoring).length > 0
    ? [
        {
          rank: 'Dominan I',
          element: selectedCoreScoring.dominan_1_elemen,
          percentage: asNumber(selectedCoreScoring.dominan_1_persentase),
        },
        {
          rank: 'Dominan II',
          element: selectedCoreScoring.dominan_2_elemen,
          percentage: asNumber(selectedCoreScoring.dominan_2_persentase),
        },
        {
          rank: 'Dominan III',
          element: selectedCoreScoring.dominan_3_elemen,
          percentage: asNumber(selectedCoreScoring.dominan_3_persentase),
        },
      ].filter((item) => item.element)
    : [];
  return (
    <div className="space-y-6" data-testid="admin-premium-results">
      {/* Header */}
      <PageHeader icon={Trophy} title="Hasil Test Premium" description="Lihat hasil analisis test premium pengguna" />

      {/* Stats */}
          {stats && (
        <StatsGrid columns={3} stats={[
          { label: 'Total Test Premium', value: stats.totalPaid || 0, icon: Trophy, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400', valueColor: 'text-yellow-400' },
          { label: 'Total Test Gratis', value: stats.totalFree || 0, icon: Star, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
          { label: 'Total Semua Test', value: stats.total || 0 },
        ]} />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Cari berdasarkan nama atau email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-[#2a2a2a] border-yellow-400/30 text-white"
          />
      </div>

      {/* Results List */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Daftar Hasil Premium ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-yellow-400/20">
                  <th className="text-left py-3 px-4 text-gray-400">User</th>
                  <th className="text-left py-3 px-4 text-gray-400">Elemen Dominan</th>
                  <th className="text-left py-3 px-4 text-gray-400">Tipe Kepribadian</th>
                  <th className="text-left py-3 px-4 text-gray-400">Tanggal Selesai</th>
                  <th className="text-left py-3 px-4 text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-[#1a1a1a]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{result.userName || 'Unknown'}</p>
                          <p className="text-gray-400 text-xs">{result.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${getElementColor(result.dominantElement)}`}>
                        {result.dominantElement || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white text-sm">{result.personalityType || '-'}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatDate(result.completedAt)}
                    </td>
                    <td className="py-3 px-4">
                      <Button 
                        size="sm" 
                        onClick={() => handleViewDetail(result)}
                        disabled={detailLoading}
                        className="bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30"
                      >
                        <Eye className="w-4 h-4 mr-1" /> Lihat Hasil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {results.length === 0 && (
            <EmptyState icon={Trophy} title="Tidak ada hasil premium ditemukan" className="py-8" />
          )}
        </CardContent>
      </Card>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
      />

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-[#2a2a2a] border-yellow-400/20 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" /> 
              Hasil Test Premium - {selectedTitle}
            </DialogTitle>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="p-4 bg-[#1a1a1a] rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Nama</p>
                    <p className="text-white">{selectedResult.userName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Email</p>
                    <p className="text-white">{selectedResult.userEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">WhatsApp</p>
                    <p className="text-white">{selectedResult.userWhatsapp || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Lokasi</p>
                    <p className="text-white">{selectedLocation}</p>
                  </div>
                </div>
              </div>

              {/* Result Summary */}
              {Object.keys(selectedAnalysis).length > 0 && (
                <>
                  <Card className="bg-gradient-to-r from-yellow-400/10 to-yellow-600/5 border-yellow-400/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Brain className="w-7 h-7 text-[#1a1a1a]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {selectedAnalysis.personalityType || selectedResult.personalityType || '-'}
                          </h3>
                          <p className="text-gray-400">
                            Dominan: {selectedResult.dominantElement || '-'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-bold text-yellow-100">
                              Kode: {selectedResult.personalityCode || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300">{selectedAnalysis.summary || 'Ringkasan hasil kepribadian belum tersedia.'}</p>
                    </CardContent>
                  </Card>

                  {selectedDominantRanks.length > 0 && (
                    <Card className="bg-[#1a1a1a] border-yellow-400/20">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-400" /> Dominan Core Scoring
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          {selectedDominantRanks.map((item) => (
                            <div key={item.rank} className="rounded-lg border border-yellow-400/15 bg-yellow-400/5 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-yellow-300">{item.rank}</p>
                              <p className="mt-2 text-lg font-bold text-white">{item.element}</p>
                              <p className="mt-1 text-2xl font-black text-yellow-400">{item.percentage.toFixed(2)}%</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Strengths & Areas to Improve */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedStrengths.length > 0 && (
                      <Card className="bg-[#1a1a1a] border-green-400/20">
                        <CardHeader>
                          <CardTitle className="text-white text-sm">Kekuatan</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {selectedStrengths.map((s, i) => (
                              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                                <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {selectedAreasToImprove.length > 0 && (
                      <Card className="bg-[#1a1a1a] border-blue-400/20">
                        <CardHeader>
                          <CardTitle className="text-white text-sm">Area Pengembangan</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {selectedAreasToImprove.map((a, i) => (
                              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                                <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Career Recommendations */}
                  {selectedCareerRecommendations.length > 0 && (
                    <Card className="bg-[#1a1a1a] border-purple-400/20">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">Rekomendasi Karir</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedCareerRecommendations.map((c, i) => (
                            <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                              {c}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {Object.keys(selectedAnalysis).length === 0 && (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Analisis hasil kepribadian belum tersedia untuk user ini</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PremiumResults;

