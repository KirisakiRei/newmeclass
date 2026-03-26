import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Badge } from "../../app/components/ui/badge";
import { Button } from "../../app/components/ui/button";
import { Card, CardContent } from "../../app/components/ui/card";
import { Clock, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { contactAPI } from "../../services/api";
import { useCMS } from "../../app/components/cms/CMSContext";

export function ContactPage() {
  const { data } = useCMS();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const contactInfo = useMemo(() => [
    { icon: Phone, title: "Telepon", value: data.global.phone, href: `tel:${String(data.global.phone || "").replace(/[^\d+]/g, "")}` },
    { icon: Mail, title: "Email", value: data.global.email, href: `mailto:${data.global.email}` },
    { icon: MapPin, title: "Alamat", value: data.global.address, href: null },
    { icon: Clock, title: "Jam Operasional", value: "Senin - Jumat, 08:00 - 17:00 WIB", href: null },
  ], [data.global.address, data.global.email, data.global.phone]);

  const whatsappHref = useMemo(() => {
    const raw = String(data.global.phone || "").replace(/[^\d]/g, "");
    const normalized = raw.startsWith("0") ? `62${raw.slice(1)}` : raw;
    return normalized ? `https://wa.me/${normalized}` : "#";
  }, [data.global.phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setLoading(true);
      await contactAPI.create({
        name: form.name,
        email: form.email,
        message: `No. HP: ${form.phone || "-"}\nSubjek: ${form.subject || "-"}\n\n${form.message}`,
      });
      setSuccess("Pesan Anda sudah kami terima. Tim kami akan segera menghubungi Anda.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pesan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-6 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">KONTAK</Badge>
            <h1 className="mb-6 text-4xl text-white sm:text-6xl" style={{ fontWeight: 800 }}>
              Hubungi <span className="text-yellow-500">Kami</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400" style={{ lineHeight: 1.8 }}>
              Punya pertanyaan atau ingin berdiskusi lebih lanjut? Tim kami siap membantu Anda.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-2">
              {contactInfo.map((item, index) => (
                <motion.div key={item.title} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
                  <Card className="border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20">
                    <CardContent className="flex items-start gap-4 p-5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10">
                        <item.icon className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500" style={{ fontWeight: 500 }}>{item.title}</p>
                        {item.href ? (
                          <a href={item.href} className="text-sm text-white transition-colors hover:text-yellow-500">{item.value}</a>
                        ) : (
                          <p className="text-sm text-white">{item.value}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.32 }}>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-5 transition-colors hover:bg-green-500/15">
                  <MessageCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="text-sm text-white" style={{ fontWeight: 600 }}>Chat via WhatsApp</p>
                    <p className="text-xs text-green-500/70">Respons cepat dari tim NEWME</p>
                  </div>
                </a>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-3">
              <Card className="border-white/10 bg-[#18181b]">
                <CardContent className="p-8">
                  <h3 className="mb-6 text-xl text-white" style={{ fontWeight: 600 }}>Kirim Pesan</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-zinc-400">Nama Lengkap</label>
                        <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-500/50" placeholder="Nama Anda" required />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-zinc-400">Email</label>
                        <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} type="email" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-500/50" placeholder="Masukkan email" required />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-zinc-400">No. Telepon</label>
                      <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-500/50" placeholder="+62 812..." />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-zinc-400">Subjek</label>
                      <input value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-500/50" placeholder="Subjek pesan" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-zinc-400">Pesan</label>
                      <textarea value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-500/50" placeholder="Tulis pesan Anda..." rows={5} required />
                    </div>
                    {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
                    {success && <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">{success}</div>}
                    <Button disabled={loading} className="w-full bg-yellow-500 py-6 text-black hover:bg-yellow-400">
                      {loading ? <><Send className="mr-2 h-4 w-4" />Mengirim...</> : <><Send className="mr-2 h-4 w-4" />Kirim Pesan</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
