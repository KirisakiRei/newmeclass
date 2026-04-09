import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "../../app/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../app/components/ui/input-otp";
import { getApiErrorMessage } from "../../services/api-error";
import { authAPI, landingAPI } from "../../services/api";
import { buildDashboardBridgeUrl, setUserSession } from "../../lib/session";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";

type LocationOption = { id: string; name: string };
type RegistrationSession = {
  registrationToken: string;
  email: string;
  maskedEmail: string;
  fullName: string;
  verified: boolean;
  resendAvailableAt: string;
  expiresAt: string;
};

const STORAGE_KEY = "newme:user-registration";
const SOURCE_OPTIONS = ["Google", "Instagram", "Facebook", "TikTok", "Iklan Online", "Teman", "Sekolah", "Lainnya"];

const readStoredSession = () => {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed?.registrationToken) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed as RegistrationSession;
  } catch {
    return null;
  }
};

const selectOptions = (items: LocationOption[]) => (
  items.map((item) => (
    <option key={item.id} value={item.id}>
      {item.name}
    </option>
  ))
);

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = String(searchParams.get("ref") || "").trim();

  const [step, setStep] = useState<1 | 2>(readStoredSession() ? 2 : 1);
  const [registrationSession, setRegistrationSession] = useState<RegistrationSession | null>(() => readStoredSession());
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState<"start" | "verify" | "resend" | "complete" | "">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<LocationOption[]>([]);
  const [villageOptions, setVillageOptions] = useState<LocationOption[]>([]);

  const [form, setForm] = useState({
    name: registrationSession?.fullName || "",
    email: registrationSession?.email || "",
    phone: "",
    birthdate: "",
    address: "",
    provinceId: "",
    cityId: "",
    districtId: "",
    villageId: "",
    source: "",
    sourceOther: "",
    password: "",
    confirm: "",
  });

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectedProvince = useMemo(
    () => provinceOptions.find((item) => item.id === form.provinceId) || null,
    [form.provinceId, provinceOptions],
  );
  const selectedCity = useMemo(
    () => cityOptions.find((item) => item.id === form.cityId) || null,
    [form.cityId, cityOptions],
  );
  const selectedDistrict = useMemo(
    () => districtOptions.find((item) => item.id === form.districtId) || null,
    [form.districtId, districtOptions],
  );
  const selectedVillage = useMemo(
    () => villageOptions.find((item) => item.id === form.villageId) || null,
    [form.villageId, villageOptions],
  );

  const otpVerified = Boolean(registrationSession?.verified);
  const passwordTooShort = form.password.length > 0 && form.password.length < 8;
  const passwordMismatch = form.confirm.length > 0 && form.password !== form.confirm;

  useEffect(() => {
    let active = true;
    authAPI
      .getSession()
      .then((sessionState) => {
        if (active && sessionState?.authenticated) {
          setUserSession(null, sessionState?.viewer || null);
          navigate("/dashboard", { replace: true });
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!registrationSession) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(registrationSession));
  }, [registrationSession]);

  useEffect(() => {
    if (!registrationSession?.resendAvailableAt) return;

    const timer = window.setInterval(() => {
      setCountdown(Math.max(new Date(registrationSession.resendAvailableAt).getTime() - Date.now(), 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [registrationSession?.resendAvailableAt]);

  useEffect(() => {
    landingAPI
      .getProvinces()
      .then((rows) => setProvinceOptions(Array.isArray(rows) ? rows : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!form.provinceId) {
      setCityOptions([]);
      return;
    }

    landingAPI
      .getCities(form.provinceId)
      .then((rows) => setCityOptions(Array.isArray(rows) ? rows : []))
      .catch(() => undefined);
  }, [form.provinceId]);

  useEffect(() => {
    if (!form.cityId) {
      setDistrictOptions([]);
      return;
    }

    landingAPI
      .getDistricts(form.cityId)
      .then((rows) => setDistrictOptions(Array.isArray(rows) ? rows : []))
      .catch(() => undefined);
  }, [form.cityId]);

  useEffect(() => {
    if (!form.districtId) {
      setVillageOptions([]);
      return;
    }

    landingAPI
      .getVillages(form.districtId)
      .then((rows) => setVillageOptions(Array.isArray(rows) ? rows : []))
      .catch(() => undefined);
  }, [form.districtId]);

  const clearSession = () => {
    setRegistrationSession(null);
    setOtp("");
    setStep(1);
    setSuccess("");

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const startRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!agreed) {
      setError("Harap setujui Syarat dan Ketentuan terlebih dahulu.");
      return;
    }

    if (passwordTooShort) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (passwordMismatch) {
      setError("Password dan konfirmasi password belum sama.");
      return;
    }

    setBusy("start");
    try {
      const response: any = await authAPI.registerStart({
        fullName: form.name,
        email: form.email,
        password: form.password,
        referralCode: referralCode || null,
      });

      const session = {
        registrationToken: String(response.registrationToken),
        email: String(response.email || form.email),
        maskedEmail: String(response.maskedEmail || form.email),
        fullName: String(response.fullName || form.name),
        verified: Boolean(response.verified),
        resendAvailableAt: String(response.resendAvailableAt),
        expiresAt: String(response.expiresAt),
      };

      setRegistrationSession(session);
      setForm((prev) => ({
        ...prev,
        name: session.fullName,
        email: session.email,
        password: "",
        confirm: "",
      }));
      setStep(2);
      setSuccess("OTP sudah dikirim ke email Anda.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal memulai registrasi."));
    } finally {
      setBusy("");
    }
  };

  const verifyOtp = async () => {
    if (!registrationSession?.registrationToken || otp.length !== 6) {
      setError("Masukkan 6 digit OTP.");
      return;
    }

    setError("");
    setSuccess("");
    setBusy("verify");

    try {
      const response: any = await authAPI.verifyRegisterOtp({
        registrationToken: registrationSession.registrationToken,
        otp,
      });

      setRegistrationSession((prev) => (
        prev
          ? {
              ...prev,
              verified: Boolean(response.verified ?? true),
              resendAvailableAt: String(response.resendAvailableAt || prev.resendAvailableAt),
            }
          : prev
      ));
      setSuccess("Email berhasil diverifikasi. Lengkapi biodata Anda.");
    } catch (err) {
      setError(getApiErrorMessage(err, "OTP tidak valid."));
    } finally {
      setBusy("");
    }
  };

  const resendOtp = async () => {
    if (!registrationSession?.registrationToken) return;

    setError("");
    setSuccess("");
    setBusy("resend");

    try {
      const response: any = await authAPI.resendRegisterOtp({
        registrationToken: registrationSession.registrationToken,
      });

      setRegistrationSession((prev) => (
        prev
          ? {
              ...prev,
              resendAvailableAt: String(response.resendAvailableAt || prev.resendAvailableAt),
            }
          : prev
      ));
      setOtp("");
      setSuccess("OTP baru sudah dikirim.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal mengirim ulang OTP."));
    } finally {
      setBusy("");
    }
  };

  const completeRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!registrationSession?.registrationToken) {
      setError("Sesi registrasi tidak ditemukan.");
      return;
    }

    if (!otpVerified) {
      setError("Verifikasi email dulu sebelum lanjut.");
      return;
    }

    if (!selectedProvince || !selectedCity || !selectedDistrict || !selectedVillage) {
      setError("Provinsi, kota, kecamatan, dan kelurahan/desa wajib dipilih.");
      return;
    }

    if (!form.source) {
      setError("Silakan pilih sumber Anda mengenal NEWME.");
      return;
    }

    if (form.source === "Lainnya" && !form.sourceOther.trim()) {
      setError("Silakan isi sumber lainnya.");
      return;
    }

    setBusy("complete");
    try {
      const response: any = await authAPI.completeRegister({
        registrationToken: registrationSession.registrationToken,
        phone: form.phone,
        whatsapp: form.phone,
        birthDate: form.birthdate,
        address: form.address,
        province: selectedProvince.name,
        city: selectedCity.name,
        district: selectedDistrict.name,
        village: selectedVillage.name,
        userType: "individual",
        referralSource: form.source.toLowerCase(),
        referralOther: form.source === "Lainnya" ? form.sourceOther : null,
        referralCode: referralCode || null,
      });

      clearSession();
      setUserSession(null, response?.user || null);
      window.location.href = buildDashboardBridgeUrl("", "/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal menyelesaikan registrasi."));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-16">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-8 text-center">
            <img src={newmeLogo} alt="NEWME Logo" className="mx-auto mb-4 h-16 w-16 object-contain" style={{ mixBlendMode: "screen" }} />
            <div className="mb-1 inline-block rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-500">
              DAFTAR AKUN BARU
            </div>
            <h1 className="mb-2 mt-3 text-2xl font-extrabold text-white sm:text-3xl">Mulai Perjalananmu</h1>
            <p className="text-sm text-zinc-400">
              Sudah punya akun? <Link to="/login" className="text-yellow-500 hover:text-yellow-400">Login di sini</Link>
            </p>
            {referralCode && (
              <p className="mt-3 text-xs text-yellow-500/80">
                Kode referral aktif: <span className="font-semibold">{referralCode}</span>
              </p>
            )}
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {["Buat Akun", "Verifikasi & Biodata"].map((label, index) => (
              <div
                key={label}
                className={`rounded-2xl border px-4 py-4 ${step === index + 1 ? "border-yellow-500/40 bg-yellow-500/10" : "border-white/10 bg-[#18181b]"}`}
              >
                <div className="flex items-center gap-3 text-sm text-white">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${step > index + 1 || (index === 1 && otpVerified) ? "bg-green-500/20 text-green-300" : step === index + 1 ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-zinc-500"}`}
                  >
                    {step > index + 1 || (index === 1 && otpVerified) ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <div>
                    <p>{label}</p>
                    <p className="text-xs text-zinc-500">{index === 0 ? "Nama, email, password" : "OTP lalu biodata lengkap"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 sm:p-8">
            {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
            {success && <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">{success}</div>}

            {step === 1 ? (
              <form onSubmit={startRegistration} className="space-y-5">
                <label className="block text-sm text-zinc-400">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white"
                    required
                  />
                </div>

                <label className="block text-sm text-zinc-400">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        className={`w-full rounded-xl border bg-white/[0.04] py-3 pl-10 pr-11 text-sm text-white ${passwordTooShort ? "border-red-500/40" : "border-white/10"}`}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className={`mt-2 text-xs ${passwordTooShort ? "text-red-300" : "text-zinc-500"}`}>Minimal 8 karakter.</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">Konfirmasi Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={form.confirm}
                        onChange={(e) => updateForm("confirm", e.target.value)}
                        className={`w-full rounded-xl border bg-white/[0.04] py-3 pl-10 pr-11 text-sm text-white ${passwordMismatch ? "border-red-500/40" : "border-white/10"}`}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordMismatch && <p className="mt-2 text-xs text-red-300">Konfirmasi password belum sama.</p>}
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-yellow-500/40"
                  />
                  <span>
                    Saya menyetujui{" "}
                    <Link to="/privacy-policy" className="font-medium text-yellow-400 underline underline-offset-2 hover:text-yellow-300">
                      Syarat dan Ketentuan
                    </Link>{" "}
                    NEWME dan memahami bahwa email saya akan diverifikasi sebelum akun aktif.
                  </span>
                </label>

                <Button type="submit" disabled={busy === "start"} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
                  {busy === "start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  {busy === "start" ? "Mengirim OTP..." : "Lanjut Verifikasi Email"}
                </Button>
              </form>
            ) : (
              <form onSubmit={completeRegistration} className="space-y-5">
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <p className="font-semibold text-white">{registrationSession?.fullName}</p>
                  <p className="text-sm text-zinc-400">{registrationSession?.email}</p>
                  <button type="button" onClick={clearSession} className="mt-2 text-xs text-yellow-400">Ganti email</button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm text-yellow-500">
                    <ShieldCheck className="h-4 w-4" />
                    Verifikasi Email
                  </div>
                  <p className="mb-4 text-sm text-zinc-400">
                    Masukkan OTP yang dikirim ke{" "}
                    <span className="text-white">{registrationSession?.maskedEmail || registrationSession?.email}</span>.
                  </p>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={otpVerified}>
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} className="border-white/10 bg-white/[0.04] text-white" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={() => void verifyOtp()}
                        disabled={busy === "verify" || otpVerified}
                        className="bg-yellow-500 text-black hover:bg-yellow-400"
                      >
                        {busy === "verify" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {otpVerified ? "Terverifikasi" : "Verifikasi OTP"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void resendOtp()}
                        disabled={busy === "resend" || countdown > 0}
                        className="border-white/10 text-zinc-200"
                      >
                        {busy === "resend" ? "Mengirim..." : countdown > 0 ? `Kirim ulang ${Math.ceil(countdown / 1000)}s` : "Kirim Ulang"}
                      </Button>
                    </div>
                  </div>
                </div>

                {!otpVerified ? (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                    Verifikasi OTP terlebih dahulu untuk membuka form biodata.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          value={form.phone}
                          onChange={(e) => updateForm("phone", e.target.value)}
                          placeholder="Nomor HP / WhatsApp"
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white"
                          required
                        />
                      </div>

                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="date"
                          value={form.birthdate}
                          onChange={(e) => updateForm("birthdate", e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white"
                          required
                        />
                      </div>

                      <div className="relative sm:col-span-2">
                        <MapPin className="absolute left-3 top-4 h-4 w-4 text-zinc-500" />
                        <textarea
                          value={form.address}
                          onChange={(e) => updateForm("address", e.target.value)}
                          placeholder="Alamat lengkap"
                          className="min-h-[88px] w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white"
                          required
                        />
                      </div>

                      <select
                        value={form.provinceId}
                        onChange={(e) => setForm((prev) => ({ ...prev, provinceId: e.target.value, cityId: "", districtId: "", villageId: "" }))}
                        className="rounded-xl border border-white/10 bg-[#18181b] px-4 py-3 text-sm text-white"
                        required
                      >
                        <option value="">Pilih provinsi</option>
                        {selectOptions(provinceOptions)}
                      </select>

                      <select
                        value={form.cityId}
                        onChange={(e) => setForm((prev) => ({ ...prev, cityId: e.target.value, districtId: "", villageId: "" }))}
                        className="rounded-xl border border-white/10 bg-[#18181b] px-4 py-3 text-sm text-white"
                        required
                      >
                        <option value="">Pilih kota / kabupaten</option>
                        {selectOptions(cityOptions)}
                      </select>

                      <select
                        value={form.districtId}
                        onChange={(e) => setForm((prev) => ({ ...prev, districtId: e.target.value, villageId: "" }))}
                        className="rounded-xl border border-white/10 bg-[#18181b] px-4 py-3 text-sm text-white"
                        required
                      >
                        <option value="">Pilih kecamatan</option>
                        {selectOptions(districtOptions)}
                      </select>

                      <select
                        value={form.villageId}
                        onChange={(e) => updateForm("villageId", e.target.value)}
                        className="rounded-xl border border-white/10 bg-[#18181b] px-4 py-3 text-sm text-white"
                        required
                      >
                        <option value="">Pilih kelurahan / desa</option>
                        {selectOptions(villageOptions)}
                      </select>

                      <div className="sm:col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {SOURCE_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, source: option, sourceOther: option === "Lainnya" ? prev.sourceOther : "" }))}
                            className={`rounded-xl border px-3 py-2 text-left text-xs ${form.source === option ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400" : "border-white/10 bg-white/[0.03] text-zinc-400"}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      {form.source === "Lainnya" ? (
                        <input
                          value={form.sourceOther}
                          onChange={(e) => updateForm("sourceOther", e.target.value)}
                          placeholder="Sumber lainnya"
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white sm:col-span-2"
                          required
                        />
                      ) : null}
                    </div>

                    <Button type="submit" disabled={busy === "complete"} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
                      {busy === "complete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                      {busy === "complete" ? "Menyelesaikan Registrasi..." : "Selesaikan Registrasi"}
                    </Button>
                  </>
                )}
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
