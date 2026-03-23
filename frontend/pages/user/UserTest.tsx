// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle, Clock, Lock, ArrowRight, AlertCircle, Trophy, Star,
  Sparkles, Brain, ArrowLeft
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { authAPI, personalityTestsAPI, questionsAPI, settingsAPI, testResultsAPI, userPaymentsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import { formatCurrency, getJenjang, getQuestionText } from '../../lib/utils';

const TEST_KEEPALIVE_INTERVAL_MS = 90 * 1000;
const TEST_DRAFT_PREFIX = 'newme_test_draft_';

const UserTest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [freeQuestions, setFreeQuestions] = useState([]);
  const [paidQuestions, setPaidQuestions] = useState([]);
  const [premiumQuestionMeta, setPremiumQuestionMeta] = useState(null);
  const [premiumQuestionError, setPremiumQuestionError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testType, setTestType] = useState(null);
  const [results, setResults] = useState(null);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [hasUsedFreeTest, setHasUsedFreeTest] = useState(false);
  const [testPrice, setTestPrice] = useState(100000);
  const [jenjang, setJenjang] = useState('dewasa');
  const [jenjangConfigData, setJenjangConfigData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const requestedType = String(searchParams.get('type') || '').trim().toLowerCase();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!testStarted || testCompleted) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void authAPI.refreshSession().catch(() => {
        // Keep background renewal silent. Submit flow will still show explicit feedback if session fails.
      });
    }, TEST_KEEPALIVE_INTERVAL_MS);

    const refreshOnFocus = () => {
      void authAPI.refreshSession().catch(() => {
        // Silent keepalive while user stays on the test flow.
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshOnFocus();
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [testStarted, testCompleted]);

  const getQuestionId = (question) => question?._id || question?.id || null;
  const isCorePremiumQuestion = (question) => Boolean(question?.answerPath);
  const getQuestionOptions = (question) => (
    Array.isArray(question?.options)
      ? question.options.map((option) => ({
          ...option,
          text: option?.text || option?.label || String(option?.value ?? ''),
        }))
      : []
  );
  const getRenderedQuestionText = (question) => (
    isCorePremiumQuestion(question)
      ? (question?.question || question?.text || '')
      : getQuestionText(question, jenjang)
  );
  const getRenderedQuestionLabel = (question) => (
    isCorePremiumQuestion(question) ? 'Premium' : (question?.category || 'Umum')
  );
  const isQuestionAnswered = (question) => {
    const questionId = getQuestionId(question);
    return questionId ? answers[questionId] !== undefined && answers[questionId] !== null : false;
  };

  const buildCorePremiumPayload = (questionList, answerMap) => {
    const payload = { tes_a: {}, tes_b: {}, tes_c: {} };

    (questionList || []).forEach((question) => {
      if (!question?.answerPath) return;
      const questionId = getQuestionId(question);
      const answerIndex = questionId ? answerMap[questionId] : undefined;
      if (answerIndex === undefined || answerIndex === null) return;

      const option = getQuestionOptions(question)[Number(answerIndex)];
      if (!option) return;

      const [stage, key, slot] = String(question.answerPath).split('.');
      if (stage === 'tes_a' && key) {
        payload.tes_a[key] = Boolean(option.value);
        return;
      }

      if (stage === 'tes_b' && key) {
        payload.tes_b[key] = String(option.value);
        return;
      }

      if (stage === 'tes_c' && key && slot) {
        const slotIndex = Math.max(Number(slot) - 1, 0);
        if (!Array.isArray(payload.tes_c[key])) {
          payload.tes_c[key] = [];
        }
        payload.tes_c[key][slotIndex] = Number(option.value);
      }
    });

    return payload;
  };

  const getDraftKey = (type = testType) => {
    const userId = user?._id || user?.id;
    if (!userId || !type) return null;
    return `${TEST_DRAFT_PREFIX}${userId}_${type}`;
  };

  const clearDraft = (type = testType) => {
    const draftKey = getDraftKey(type);
    if (!draftKey) return;
    localStorage.removeItem(draftKey);
  };

  const hydrateDraft = (type, questionList) => {
    const draftKey = getDraftKey(type);
    if (!draftKey) return null;

    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      const validQuestionIds = new Set((questionList || []).map((item) => getQuestionId(item)).filter(Boolean));
      const nextAnswers = Object.entries(draft?.answers || {}).reduce((acc, [questionId, answerIndex]) => {
        if (validQuestionIds.has(questionId)) {
          acc[questionId] = answerIndex;
        }
        return acc;
      }, {});

      return {
        answers: nextAnswers,
        currentQuestion: Math.max(
          0,
          Math.min(Number(draft?.currentQuestion || 0), Math.max((questionList?.length || 1) - 1, 0)),
        ),
      };
    } catch {
      return null;
    }
  };

  const beginTestSession = (type, questionList) => {
    const restoredDraft = hydrateDraft(type, questionList);
    setQuestions(questionList);
    setTestType(type);
    setTestStarted(true);
    setTestCompleted(false);

    if (restoredDraft) {
      setAnswers(restoredDraft.answers || {});
      setCurrentQuestion(restoredDraft.currentQuestion || 0);
      toast({
        title: 'Melanjutkan sesi tes',
        description: 'Jawaban terakhir Anda dipulihkan agar bisa dilanjutkan.',
      });
      return;
    }

    setCurrentQuestion(0);
    setAnswers({});
  };

  useEffect(() => {
    if (!testStarted || testCompleted || !testType || !user) {
      return;
    }

    const draftKey = getDraftKey(testType);
    if (!draftKey) return;

    localStorage.setItem(draftKey, JSON.stringify({
      testType,
      answers,
      currentQuestion,
      savedAt: new Date().toISOString(),
    }));
  }, [answers, currentQuestion, testStarted, testCompleted, testType, user]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('user_token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await authAPI.getProfile();
      setUser(response.data);
      await loadAllData(response.data._id || response.data.id, response.data);
    } catch (error) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async (userId, userObj) => {
    const userData = userObj || user;
    try {
      // Load test price from settings
      try {
        const referralCode = userData.usedReferralCode || userData.referredByCode || null;
        const priceRes = await userPaymentsAPI.getTestPrice(referralCode);
        setTestPrice(priceRes.data.totalPrice || priceRes.data.testPrice || 100000);
      } catch (e) {
        try {
          const fallbackRes = await settingsAPI.getTestPrice();
          setTestPrice(fallbackRes.data.testPrice || 100000);
        } catch (_ignored) {
          console.log('Using default price');
        }
      }
      
      const [legacyQuestionsRes, premiumQuestionsRes] = await Promise.allSettled([
        questionsAPI.getPublic(),
        personalityTestsAPI.getCorePremiumQuestions(),
      ]);

      const allQuestions = legacyQuestionsRes.status === 'fulfilled'
        ? (legacyQuestionsRes.value.data || [])
        : [];
      const free = allQuestions.filter(q => q.isFree === true);
      const paidPayload = premiumQuestionsRes.status === 'fulfilled'
        ? (premiumQuestionsRes.value.data || null)
        : null;
      const paid = Array.isArray(paidPayload?.questions) ? paidPayload.questions : [];

      setFreeQuestions(free);
      setPaidQuestions(paid);
      setPremiumQuestionMeta(paidPayload);
      setPremiumQuestionError(
        premiumQuestionsRes.status === 'rejected'
          ? getApiErrorMessage(
              premiumQuestionsRes.reason,
              'Pertanyaan premium belum bisa dimuat. Pastikan tanggal lahir profil Anda sudah terisi dengan benar.',
            )
          : '',
      );

      // Load jenjang config & compute user's jenjang
      try {
        const cfgRes = await settingsAPI.getJenjangConfig();
        setJenjangConfigData(cfgRes.data);
        if (userData.birthDate) {
          setJenjang(getJenjang(userData.birthDate, cfgRes.data));
        }
      } catch (e) { /* default 'dewasa' */ }
      // Check paid access
      let paidAccessGranted = false;
      try {
        const paymentRes = await userPaymentsAPI.getStatus(userId);
        paidAccessGranted = paymentRes.data.status === 'paid' || paymentRes.data.hasPaidAccess === true;
        setHasPaidAccess(paidAccessGranted);
      } catch (e) {
        setHasPaidAccess(false);
      }
      
      // Check if user already used free test
      let freeTestAlreadyUsed = false;
      try {
        const freeTestRes = await testResultsAPI.checkFreeTest(userId);
        freeTestAlreadyUsed = freeTestRes.data.hasUsedFreeTest === true;
        setHasUsedFreeTest(freeTestAlreadyUsed);
      } catch (e) {
        setHasUsedFreeTest(false);
      }

      if (requestedType === 'free' && !freeTestAlreadyUsed && free.length > 0) {
        beginTestSession('free', free);
      }

      if (requestedType === 'paid') {
        if (String(userData?.paidTestStatus || '').toLowerCase() === 'completed') {
          navigate('/dashboard?tab=results', { replace: true });
          return;
        }
        if (paidAccessGranted && paid.length > 0) {
          beginTestSession('paid', paid);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Gagal memuat pertanyaan',
        description: getApiErrorMessage(error, 'Pertanyaan tes belum bisa dimuat. Silakan coba lagi atau hubungi admin.'),
        variant: 'destructive',
      });
      setFreeQuestions([]);
      setPaidQuestions([]);
    }
  };

  const startFreeTest = () => {
    // Check if user already used free test
    if (hasUsedFreeTest) {
      toast({
        title: 'Test Gratis Sudah Digunakan',
        description: 'Anda sudah pernah mengambil test gratis. Silakan upgrade ke Test Premium untuk analisis lengkap.',
        variant: 'destructive'
      });
      return;
    }
    
    if (freeQuestions.length === 0) {
      toast({
        title: 'Tidak Ada Pertanyaan',
        description: 'Pertanyaan gratis belum tersedia. Silakan hubungi admin.',
        variant: 'destructive'
      });
      return;
    }
    beginTestSession('free', freeQuestions);
  };

  const startPaidTest = async () => {
    if (String(user?.paidTestStatus || '').toLowerCase() === 'completed') {
      toast({
        title: 'Tes Premium Sudah Selesai',
        description: 'Tes premium hanya bisa dikerjakan satu kali. Anda akan diarahkan ke hasil tes.',
      });
      navigate('/dashboard?tab=results');
      return;
    }

    if (paidQuestions.length === 0) {
      toast({
        title: 'Tidak Ada Pertanyaan',
        description: premiumQuestionError || 'Pertanyaan berbayar belum tersedia.',
        variant: 'destructive'
      });
      return;
    }

    if (!hasPaidAccess) {
      toast({
        title: 'Pembayaran Dibutuhkan',
        description: 'Selesaikan pembayaran premium dari dashboard terlebih dahulu.',
        variant: 'destructive'
      });
      navigate('/dashboard');
      return;
    }

    beginTestSession('paid', paidQuestions);
  };

  const handleAnswer = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex  // store option index (0-based)
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const submitTest = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast({
        title: 'Jawaban belum lengkap',
        description: 'Mohon jawab seluruh pertanyaan sebelum mengakhiri tes.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const result = {
      answeredCount: Object.keys(answers).length,
      totalQuestions: questions.length,
      totalScore: 0,
      categories: {},
      testType,
      completedAt: new Date().toISOString()
    };

    try {
      let saveResponse;
      const isCorePremiumSession = testType === 'paid' && questions.some((question) => isCorePremiumQuestion(question));
      try {
        saveResponse = isCorePremiumSession
          ? await personalityTestsAPI.submitCorePremium(buildCorePremiumPayload(questions, answers))
          : await testResultsAPI.submit({
              testType,
              answers,
            });
      } catch (error) {
        if (error?.response?.status === 401) {
          await authAPI.refreshSession();
          saveResponse = isCorePremiumSession
            ? await personalityTestsAPI.submitCorePremium(buildCorePremiumPayload(questions, answers))
            : await testResultsAPI.submit({
                testType,
                answers,
              });
        } else {
          throw error;
        }
      }

      const createdResultId = saveResponse?.data?.resultId;
      if (!createdResultId) {
        throw new Error('Result ID not returned');
      }

      if (testType === 'free') {
        setHasUsedFreeTest(true);
      }

      try {
        const refreshedProfile = await authAPI.getProfile();
        setUser(refreshedProfile.data);
      } catch {
        // Result page remains the source of truth even if profile refresh is delayed.
      }

      clearDraft(testType);
      setResults(result);
      setTestCompleted(true);
      navigate(`/test-result/${createdResultId}`, { replace: true });
      return;
    } catch (error) {
      console.error('Failed to save results:', error);
      toast({
        title: 'Hasil tes belum tersimpan',
        description: getApiErrorMessage(error, 'Terjadi kendala saat menyimpan hasil tes. Jawaban Anda masih ada, silakan coba submit lagi.'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetTest = () => {
    clearDraft(testType);
    setTestStarted(false);
    setTestCompleted(false);
    setQuestions([]);
    setAnswers({});
    setCurrentQuestion(0);
    setResults(null);
    setTestType(null);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center">
        <div className="text-yellow-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  // Test Selection Screen
  if (!testStarted) {
    const hasCompletedPremium = String(user?.paidTestStatus || '').toLowerCase() === 'completed';
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] py-8" data-testid="user-test-page">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Test Kepribadian</h1>
              <p className="text-gray-400">Pilih jenis test yang ingin Anda ikuti</p>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" className="border-yellow-400 text-yellow-400">
                <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
              </Button>
            </Link>
          </div>

          {/* Test Options */}
          <div className={`grid gap-6 ${user?.isYayasanLinked ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
            {/* Free Test */}
            {!user?.isYayasanLinked && (
            <Card className="bg-[#2a2a2a] border-green-500/30 hover:border-green-500 transition-all">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-white">NEWME TEST</CardTitle>
                    <CardDescription className="text-green-400">GRATIS - 1x Kesempatan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> {freeQuestions.length} pertanyaan dasar
                  </li>
                  <li className="flex items-center text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Hasil kepribadian singkat
                  </li>
                  <li className="flex items-center text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Preview analisis diri
                  </li>
                </ul>
                <Button 
                  onClick={startFreeTest}
                  disabled={freeQuestions.length === 0 || hasUsedFreeTest}
                  className={`w-full ${hasUsedFreeTest ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
                >
                  {hasUsedFreeTest ? (
                    <>Sudah Digunakan <CheckCircle className="w-4 h-4 ml-2" /></>
                  ) : freeQuestions.length > 0 ? (
                    <>Mulai NEWME TEST <ArrowRight className="w-4 h-4 ml-2" /></>
                  ) : (
                    'Pertanyaan Tidak Tersedia'
                  )}
                </Button>
                {hasUsedFreeTest && (
                  <p className="text-yellow-400 text-xs mt-2 text-center">
                    Upgrade ke NEWME Premium untuk analisis lengkap
                  </p>
                )}
              </CardContent>
            </Card>
            )}

            {/* Paid Test */}
            <Card className="bg-[#2a2a2a] border-yellow-500/30 hover:border-yellow-500 transition-all">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <CardTitle className="text-white">NEWME Premium</CardTitle>
                    <CardDescription className={hasPaidAccess ? "text-green-400 font-semibold" : "text-yellow-400"}>
                      {hasPaidAccess ? 'SUDAH DIBAYAR' : formatCurrency(testPrice)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-yellow-500 mr-2" /> {paidQuestions.length} pertanyaan lengkap
                  </li>
                  {premiumQuestionMeta?.hiddenTesCElement && (
                    <li className="flex items-center text-gray-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-yellow-500 mr-2" /> 1 kelompok Tes C disesuaikan otomatis dari tanggal lahir profil
                    </li>
                  )}
                  <li className="flex items-center text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-yellow-500 mr-2" /> Analisis mendalam
                  </li>
                  <li className="flex items-center text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-yellow-500 mr-2" /> Sertifikat digital
                  </li>
                  <li className="flex items-center text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-yellow-500 mr-2" /> Rekomendasi karir
                  </li>
                </ul>
                <Button 
                  onClick={startPaidTest}
                  disabled={paidQuestions.length === 0}
                  className={`w-full ${hasCompletedPremium ? 'bg-purple-500 hover:bg-purple-600 text-white' : hasPaidAccess ? 'bg-green-500 hover:bg-green-600 text-black' : 'bg-yellow-400 hover:bg-yellow-500 text-black'}`}
                >
                  {hasCompletedPremium ? (
                    <>Lihat Hasil Premium <ArrowRight className="w-4 h-4 ml-2" /></>
                  ) : hasPaidAccess ? (
                    <>Mulai Test Premium <ArrowRight className="w-4 h-4 ml-2" /></>
                  ) : (
                    <>Selesaikan Pembayaran Dulu <Lock className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
                {hasCompletedPremium ? (
                  <p className="text-purple-300 text-xs mt-2 text-center">
                    Tes premium sudah selesai dan tidak dapat diulang
                  </p>
                ) : premiumQuestionError ? (
                  <p className="text-red-300 text-xs mt-2 text-center">
                    {premiumQuestionError}
                  </p>
                ) : !hasPaidAccess && (
                  <p className="text-yellow-400 text-xs mt-2 text-center">
                    Lakukan pembayaran dari dashboard untuk membuka test premium
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {(freeQuestions.length === 0 && paidQuestions.length === 0) && (
            <Card className="mt-6 bg-red-500/10 border-red-500/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <p className="text-white font-semibold">Pertanyaan Belum Ada</p>
                    <p className="text-gray-400 text-sm">Pertanyaan tes belum tersedia. Silakan hubungi admin dashboard.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Test Completed Screen
  if (testCompleted && results) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="bg-[#2a2a2a] border-yellow-400/30">
            <CardHeader className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-[#1a1a1a]" />
              </div>
              <CardTitle className="text-white text-2xl">Test Selesai!</CardTitle>
              <CardDescription className="text-gray-400">
                Terima kasih telah menyelesaikan test {testType === 'free' ? 'gratis' : 'berbayar'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Results Summary */}
              <div className="bg-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-yellow-400 font-semibold mb-4">Hasil Test Anda</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-[#2a2a2a] rounded-lg">
                    <p className="text-3xl font-bold text-white">{results.answeredCount}</p>
                    <p className="text-gray-400 text-sm">Dijawab</p>
                  </div>
                  <div className="text-center p-4 bg-[#2a2a2a] rounded-lg">
                    <p className="text-3xl font-bold text-yellow-400">{results.totalScore || 0}</p>
                    <p className="text-gray-400 text-sm">Total Skor</p>
                  </div>
                </div>
                
                {/* Category Scores */}
                {results.categories && Object.keys(results.categories).length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-sm mb-2">Skor per Kategori:</p>
                    <div className="space-y-2">
                      {Object.entries(results.categories).map(([cat, score]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="text-gray-300 capitalize">{cat}</span>
                          <span className="text-yellow-400 font-semibold">{score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="bg-yellow-400/10 rounded-lg p-6 border border-yellow-400/30">
                <h3 className="text-yellow-400 font-semibold mb-3 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" /> Rekomendasi
                </h3>
                <p className="text-gray-300 text-sm">
                  Berdasarkan hasil test Anda, kami merekomendasikan untuk terus mengembangkan 
                  potensi diri melalui program-program NEWMECLASS. Untuk analisis lebih mendalam, 
                  ikuti test berbayar kami.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  onClick={resetTest}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black"
                >
                  Test Lagi
                </Button>
                <Link to="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full border-yellow-400 text-yellow-400">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Test In Progress Screen
  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestion === questions.length - 1;
  const currentAnswer = currentQ ? answers[getQuestionId(currentQ)] : null;
  const currentOptions = getQuestionOptions(currentQ);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">
              Pertanyaan {currentQuestion + 1} dari {questions.length}
            </span>
            <span className="text-yellow-400 text-sm font-semibold">
              {testType === 'free' ? 'Test Gratis' : 'Test Berbayar'}
            </span>
          </div>
          <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Jenjang badge */}
        {jenjang !== 'dewasa' && jenjangConfigData && (
          <div className="mb-3 flex justify-end">
            <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400/70 border border-yellow-400/20">
              Versi {jenjangConfigData[jenjang].label || jenjang.toUpperCase()}
            </span>
          </div>
        )}

        {/* Question Card */}
        <Card className="bg-[#2a2a2a] border-yellow-400/30">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-[#1a1a1a]" />
              </div>
              <span className="text-yellow-400 text-sm capitalize">{getRenderedQuestionLabel(currentQ)}</span>
            </div>
            <CardTitle className="text-white text-xl leading-relaxed">
              {getRenderedQuestionText(currentQ)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(getQuestionId(currentQ), index)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  currentAnswer === index ?
                     'border-yellow-400 bg-yellow-400/10 text-white'
                    : 'border-gray-600 bg-[#1a1a1a] text-gray-300 hover:border-yellow-400/50'
                }`}
                data-testid={`option-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    currentAnswer === index ?
                       'border-yellow-400 bg-yellow-400'
                      : 'border-gray-500'
                  }`}>
                    {currentAnswer === index && (
                      <CheckCircle className="w-4 h-4 text-[#1a1a1a]" />
                    )}
                  </div>
                  <span>{option.text}</span>
                </div>
              </button>
            ))}

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                variant="outline"
                className="flex-1 border-gray-500 text-gray-300 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Sebelumnya
              </Button>
              
              {isLastQuestion ? (
                <Button
                  onClick={submitTest}
                  disabled={Object.keys(answers).length < questions.length || submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting ? (
                    <>Menyimpan Hasil...</>
                  ) : (
                    <>Selesai <CheckCircle className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextQuestion}
                  disabled={!isQuestionAnswered(currentQ)}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black"
                >
                  Selanjutnya <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            {/* Answer counter */}
            <p className="text-center text-gray-400 text-sm pt-2">
              {Object.keys(answers).length} dari {questions.length} pertanyaan dijawab
            </p>
          </CardContent>
        </Card>

        {/* Exit button */}
        <div className="text-center mt-4">
          <Button
            onClick={resetTest}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            Keluar dari Test
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserTest;
