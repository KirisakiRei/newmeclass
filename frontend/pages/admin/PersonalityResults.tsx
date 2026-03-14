// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Brain, Edit, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { personalityResultsAPI } from '../../services/api';
import PageHeader from '../../components/ui/page-header';
import { TableSkeleton } from '../../components/ui/loading-spinner';

const SOCIAL_COLORS = {
  extrovert: { badge: 'text-green-400 bg-green-400/10 border border-green-400/30', dot: 'bg-green-400', heading: 'text-green-400' },
  introvert:  { badge: 'text-blue-400 bg-blue-400/10 border border-blue-400/30',   dot: 'bg-blue-400',  heading: 'text-blue-400'  },
  ambivert:   { badge: 'text-purple-400 bg-purple-400/10 border border-purple-400/30', dot: 'bg-purple-400', heading: 'text-purple-400' },
};
const SOCIAL_LABELS = { extrovert: 'Extrovert', introvert: 'Introvert', ambivert: 'Ambivert' };

const PersonalityResults = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    personalityResultsAPI.getAll()
      .then(res => setResults(res.data || []))
      .catch(() => toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const grouped = { extrovert: [], introvert: [], ambivert: [] };
  results.forEach(r => { if (grouped[r.socialType]) grouped[r.socialType].push(r); });

  return (
    <div>
      <PageHeader icon={Brain} title="Hasil Kepribadian"
        description="Kelola konten hasil tes untuk 9 kode kepribadian NMC. Hasil ditentukan otomatis dari skor tertinggi user.">
        <span className="text-gray-500 text-sm">{results.length} kode terdaftar</span>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : (
        <div className="space-y-8">
          {['extrovert', 'introvert', 'ambivert'].map(socialType => {
            const c = SOCIAL_COLORS[socialType];
            return (
              <div key={socialType}>
                <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${c.heading}`}>
                  <span className={`w-2 h-2 rounded-full inline-block ${c.dot}`} />
                  {SOCIAL_LABELS[socialType]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[socialType].map(result => (
                    <Card key={result.code}
                      onClick={() => navigate(`/admin/personality-results/${result.code}`)}
                      className="bg-[#2a2a2a] border-white/10 cursor-pointer hover:border-yellow-400/40 hover:bg-[#333] transition-all group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white"
                              style={{ backgroundColor: result.color }}>
                              {result.code.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-semibold text-sm truncate">{result.label}</p>
                              <p className="text-gray-500 text-xs mt-0.5 font-mono">Elemen: {result.element.toUpperCase()}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 transition-colors shrink-0 mt-1" />
                        </div>

                        <p className="text-gray-400 text-xs mt-3 line-clamp-2 leading-relaxed">
                          {result.aiAnalysis?.summary || '—'}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {(result.aiAnalysis?.careerRecommendations || []).slice(0, 3).map((c, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-yellow-400/10 text-yellow-400 rounded">{c}</span>
                          ))}
                          {((result.aiAnalysis?.careerRecommendations || []).length || 0) > 3 && (
                            <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-500 rounded">
                              +{(result.aiAnalysis?.careerRecommendations || []).length - 3}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PersonalityResults;
