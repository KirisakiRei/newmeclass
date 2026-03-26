import { type ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, Calendar, CheckCircle2, ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, MapPin, Phone, User } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import { authAPI, landingAPI } from "../../services/api";
import { setUserSession } from "../../lib/session";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";

type LocationOption = { id: string; name: string };
type SelectOption = { value: string; label: string };

const sourceOptions: SelectOption[] = [
  { value: "google", label: "Google" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "iklan", label: "Iklan Online" },
  { value: "teman", label: "Teman" },
  { value: "sekolah", label: "Sekolah" },
  { value: "lainnya", label: "Lainnya" },
];

function FieldWrapper({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-zinc-400">
        {label}
        {required && <span className="ml-0.5 text-yellow-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  ...rest
}: {
  icon?: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  [key: string]: any;
}) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50 focus:bg-white/[0.06] ${Icon ? "pl-10 pr-4" : "px-4"}`}
        {...rest}
      />
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none rounded-xl border border-white/10 bg-[#18181b] py-3 px-4 pr-9 text-sm outline-none transition-colors focus:border-yellow-500/50 disabled:cursor-not-allowed disabled:opacity-40 ${value ? "text-white" : "text-zinc-600"}`}
      >
        <option value="" disabled className="bg-[#18181b]">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#18181b] text-white">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
    </div>
  );
}

const toSelectOptions = (items: LocationOption[]) => items.map((item) => ({ value: item.id, label: item.name }));

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const referralCode = String(searchParams.get("ref") || "").trim();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingLocations, setLoadingLocations] = useState({
    provinces: false,
    cities: false,
    districts: false,
    villages: false,
  });
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<LocationOption[]>([]);
  const [villageOptions, setVillageOptions] = useState<LocationOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    birthdate: "",
    address: "",
    provinceId: "",
    cityId: "",
    districtId: "",
    villageId: "",
    districtText: "",
    villageText: "",
    source: "",
    sourceOther: "",
    password: "",
    confirm: "",
  });

  const selectedProvince = useMemo(() => provinceOptions.find((item) => item.id === form.provinceId) || null, [form.provinceId, provinceOptions]);
  const selectedCity = useMemo(() => cityOptions.find((item) => item.id === form.cityId) || null, [cityOptions, form.cityId]);
  const selectedDistrict = useMemo(() => districtOptions.find((item) => item.id === form.districtId) || null, [districtOptions, form.districtId]);
  const selectedVillage = useMemo(() => villageOptions.find((item) => item.id === form.villageId) || null, [form.villageId, villageOptions]);
  const passwordMatch = Boolean(form.password && form.confirm && form.password === form.confirm);
  const passwordMismatch = Boolean(form.confirm && form.password !== form.confirm);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoadingLocations((prev) => ({ ...prev, provinces: true }));
        const rows = await landingAPI.getProvinces();
        if (active) setProvinceOptions(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat provinsi");
      } finally {
        if (active) setLoadingLocations((prev) => ({ ...prev, provinces: false }));
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!form.provinceId) {
      setCityOptions([]);
      return;
    }
    const load = async () => {
      try {
        setLoadingLocations((prev) => ({ ...prev, cities: true }));
        const rows = await landingAPI.getCities(form.provinceId);
        if (active) setCityOptions(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat kota");
      } finally {
        if (active) setLoadingLocations((prev) => ({ ...prev, cities: false }));
      }
    };
    void load();
    return () => { active = false; };
  }, [form.provinceId]);

  useEffect(() => {
    let active = true;
    if (!form.cityId) {
      setDistrictOptions([]);
      return;
    }
    const load = async () => {
      try {
        setLoadingLocations((prev) => ({ ...prev, districts: true }));
        const rows = await landingAPI.getDistricts(form.cityId);
        if (active) setDistrictOptions(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat kecamatan");
      } finally {
        if (active) setLoadingLocations((prev) => ({ ...prev, districts: false }));
      }
    };
    void load();
    return () => { active = false; };
  }, [form.cityId]);

  useEffect(() => {
    let active = true;
    if (!form.districtId) {
      setVillageOptions([]);
      return;
    }
    const load = async () => {
      try {
        setLoadingLocations((prev) => ({ ...prev, villages: true }));
        const rows = await landingAPI.getVillages(form.districtId);
        if (active) setVillageOptions(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat kelurahan");
      } finally {
        if (active) setLoadingLocations((prev) => ({ ...prev, villages: false }));
      }
    };
    void load();
    return () => { active = false; };
  }, [form.districtId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!agreed) return setError("Harap setujui Kebijakan Privasi terlebih dahulu.");
    if (form.password !== form.confirm) return setError("Password dan konfirmasi password belum sama.");
    if (form.password.length < 8) return setError("Password minimal 8 karakter.");
    if (!selectedProvince || !selectedCity) return setError("Provinsi dan kota wajib dipilih.");
    if (!form.source) return setError("Silakan pilih sumber Anda mengenal NEWME.");
    if (form.source === "lainnya" && !form.sourceOther.trim()) return setError("Silakan isi sumber lainnya.");
    try {
      setLoading(true);
      const response = await authAPI.register({
        email: form.email,
        password: form.password,
        fullName: form.name,
        phone: form.phone,
        whatsapp: form.phone,
        birthDate: form.birthdate,
        address: form.address,
        province: selectedProvince.name,
        city: selectedCity.name,
        district: selectedDistrict?.name || form.districtText,
        village: selectedVillage?.name || form.villageText,
        userType: "individual",
        referralSource: form.source,
        referralOther: form.source === "lainnya" ? form.sourceOther : null,
        referralCode: referralCode || null,
      });
      const token = response?.token || response?.access_token;
      if (!token) throw new Error("Token registrasi tidak ditemukan");
      setUserSession(token, response?.user || null);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat akun");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-16">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-8 text-center">
            <div className="mb-4 flex flex-col items-center gap-2">
              <div className="h-16 w-16">
                <img src={newmeLogo} alt="NEWME Logo" className="h-full w-full object-contain" style={{ mixBlendMode: "screen" }} />
              </div>
              <div className="leading-none">
                <p className="text-base text-white" style={{ fontWeight: 800 }}>NEWME <span className="text-yellow-500">CLASS</span></p>
                <p className="text-[11px] italic text-zinc-500">Jati dirimu disini</p>
              </div>
            </div>
            <div className="mb-1 inline-block rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-500" style={{ fontWeight: 500 }}>
              DAFTAR AKUN BARU
            </div>
            <h1 className="mt-3 mb-2 text-2xl text-white sm:text-3xl" style={{ fontWeight: 800 }}>Mulai Perjalananmu</h1>
            <p className="text-sm text-zinc-400">
              Sudah punya akun?{" "}
              <Link to="/login" className="text-yellow-500 transition-colors hover:text-yellow-400" style={{ fontWeight: 500 }}>
                Login di sini
              </Link>
            </p>
            {referralCode && <p className="mt-3 text-xs text-yellow-500/80">Kode referral aktif: <span className="font-semibold">{referralCode}</span></p>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-sm text-yellow-500" style={{ fontWeight: 600 }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/15 text-xs">1</span>
                  Informasi Pribadi
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldWrapper label="Nama Lengkap" required>
                    <TextInput icon={User} placeholder="Nama lengkap Anda" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} required />
                  </FieldWrapper>
                  <FieldWrapper label="Email" required>
                    <TextInput icon={Mail} type="email" placeholder="Masukkan email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} required />
                  </FieldWrapper>
                  <FieldWrapper label="Nomor HP / WhatsApp" required>
                    <TextInput icon={Phone} type="tel" placeholder="Masukkan nomor HP" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} required />
                  </FieldWrapper>
                  <FieldWrapper label="Tanggal Lahir" required>
                    <TextInput icon={Calendar} type="date" value={form.birthdate} onChange={(value) => setForm((prev) => ({ ...prev, birthdate: value }))} required />
                  </FieldWrapper>
                </div>
              </div>

              <div className="h-px bg-white/8" />

              <div>
                <h2 className="mb-4 flex items-center gap-2 text-sm text-yellow-500" style={{ fontWeight: 600 }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/15 text-xs">2</span>
                  Alamat Lengkap
                </h2>
                <div className="space-y-4">
                  <FieldWrapper label="Alamat Jalan">
                    <TextInput icon={MapPin} placeholder="Jl. Nama Jalan No. XX, RT/RW" value={form.address} onChange={(value) => setForm((prev) => ({ ...prev, address: value }))} />
                  </FieldWrapper>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldWrapper label="Provinsi" required>
                      <SelectInput
                        placeholder={loadingLocations.provinces ? "Memuat provinsi..." : "Pilih provinsi"}
                        value={form.provinceId}
                        onChange={(value) => setForm((prev) => ({ ...prev, provinceId: value, cityId: "", districtId: "", villageId: "", districtText: "", villageText: "" }))}
                        options={toSelectOptions(provinceOptions)}
                        disabled={loadingLocations.provinces}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Kota / Kabupaten" required>
                      <SelectInput
                        placeholder={form.provinceId ? (loadingLocations.cities ? "Memuat kota..." : "Pilih kota / kabupaten") : "Pilih provinsi dahulu"}
                        value={form.cityId}
                        onChange={(value) => setForm((prev) => ({ ...prev, cityId: value, districtId: "", villageId: "", districtText: "", villageText: "" }))}
                        options={toSelectOptions(cityOptions)}
                        disabled={!form.provinceId || loadingLocations.cities}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Kecamatan">
                      <SelectInput
                        placeholder={form.cityId ? (loadingLocations.districts ? "Memuat kecamatan..." : districtOptions.length ? "Pilih kecamatan" : "Isi manual bila tidak tersedia") : "Pilih kota dahulu"}
                        value={form.districtId}
                        onChange={(value) => setForm((prev) => ({ ...prev, districtId: value, villageId: "", villageText: "" }))}
                        options={toSelectOptions(districtOptions)}
                        disabled={!form.cityId || loadingLocations.districts}
                      />
                      {form.cityId && !loadingLocations.districts && districtOptions.length === 0 && (
                        <div className="mt-2">
                          <TextInput placeholder="Tulis kecamatan manual" value={form.districtText} onChange={(value) => setForm((prev) => ({ ...prev, districtText: value }))} />
                        </div>
                      )}
                    </FieldWrapper>
                    <FieldWrapper label="Kelurahan / Desa">
                      <SelectInput
                        placeholder={form.districtId ? (loadingLocations.villages ? "Memuat kelurahan..." : villageOptions.length ? "Pilih kelurahan / desa" : "Isi manual bila tidak tersedia") : "Pilih kecamatan dahulu"}
                        value={form.villageId}
                        onChange={(value) => setForm((prev) => ({ ...prev, villageId: value }))}
                        options={toSelectOptions(villageOptions)}
                        disabled={!form.districtId || loadingLocations.villages}
                      />
                      {form.districtId && !loadingLocations.villages && villageOptions.length === 0 && (
                        <div className="mt-2">
                          <TextInput placeholder="Tulis kelurahan / desa manual" value={form.villageText} onChange={(value) => setForm((prev) => ({ ...prev, villageText: value }))} />
                        </div>
                      )}
                    </FieldWrapper>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/8" />

              <div>
                <h2 className="mb-4 flex items-center gap-2 text-sm text-yellow-500" style={{ fontWeight: 600 }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/15 text-xs">3</span>
                  Mengenal NEWME
                </h2>
                <FieldWrapper label="Mengetahui NEWME dari mana?" required>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {sourceOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, source: option.value, sourceOther: option.value === "lainnya" ? prev.sourceOther : "" }))}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${form.source === option.value ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"}`}
                        style={{ fontWeight: form.source === option.value ? 600 : 400 }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </FieldWrapper>
                {form.source === "lainnya" && (
                  <div className="mt-4">
                    <FieldWrapper label="Sumber lainnya" required>
                      <TextInput placeholder="Contoh: rekomendasi guru, event komunitas, dll" value={form.sourceOther} onChange={(value) => setForm((prev) => ({ ...prev, sourceOther: value }))} required />
                    </FieldWrapper>
                  </div>
                )}
              </div>

              <div className="h-px bg-white/8" />

              <div>
                <h2 className="mb-4 flex items-center gap-2 text-sm text-yellow-500" style={{ fontWeight: 600 }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/15 text-xs">4</span>
                  Keamanan Akun
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldWrapper label="Password" required>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Min. 8 karakter"
                        minLength={8}
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50 focus:bg-white/[0.06]"
                      />
                      <button type="button" onClick={() => setShowPass((prev) => !prev)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FieldWrapper>
                  <FieldWrapper label="Konfirmasi Password" required>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={form.confirm}
                        onChange={(e) => setForm((prev) => ({ ...prev, confirm: e.target.value }))}
                        placeholder="Ulangi password"
                        required
                        className={`w-full rounded-xl border bg-white/[0.04] py-3 pl-10 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:bg-white/[0.06] ${passwordMismatch ? "border-red-500/50 focus:border-red-500" : passwordMatch ? "border-green-500/50 focus:border-green-500" : "border-white/10 focus:border-yellow-500/50"}`}
                      />
                      <button type="button" onClick={() => setShowConfirm((prev) => !prev)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordMismatch && <p className="mt-1 text-xs text-red-400">Password tidak cocok</p>}
                    {passwordMatch && <p className="mt-1 flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="h-3 w-3" />Password cocok</p>}
                  </FieldWrapper>
                </div>
                <p className="mt-2 text-xs text-zinc-600">Password minimal 8 karakter agar akun Anda lebih aman.</p>
              </div>

              <div className="h-px bg-white/8" />

              <label className="flex cursor-pointer items-start gap-3">
                <button
                  type="button"
                  onClick={() => setAgreed((prev) => !prev)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${agreed ? "border-yellow-500 bg-yellow-500" : "border-white/20 bg-white/[0.04] hover:border-yellow-500/40"}`}
                >
                  {agreed && (
                    <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-zinc-400" style={{ lineHeight: 1.6 }}>
                  Saya telah membaca dan menyetujui{" "}
                  <Link to="/privacy-policy" target="_blank" className="text-yellow-500 underline-offset-2 transition-colors hover:text-yellow-400 hover:underline" style={{ fontWeight: 500 }}>
                    Kebijakan Privasi
                  </Link>{" "}
                  NEWME CLASS.
                </span>
              </label>

              {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

              <Button type="submit" disabled={!agreed || loading} className="w-full bg-yellow-500 py-5 text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50" style={{ fontWeight: 600 }}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses Pendaftaran...</> : <>Daftar Sekarang <ArrowRight className="ml-1 h-4 w-4" /></>}
              </Button>

              <p className="text-center text-sm text-zinc-500">
                Sudah punya akun?{" "}
                <Link to="/login" className="text-yellow-500 transition-colors hover:text-yellow-400" style={{ fontWeight: 500 }}>
                  Login di sini
                </Link>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
