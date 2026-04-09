import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useSearchParams } from "react-router";
import { Badge } from "../../app/components/ui/badge";
import { Button } from "../../app/components/ui/button";
import { Card, CardContent } from "../../app/components/ui/card";
import { CheckCircle, Loader2, Search, Shield, XCircle } from "lucide-react";
import { certificateAPI } from "../../services/api";

type VerifyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; payload: any }
  | { status: "notfound"; message: string };

export function CertificateVerifyPage() {
  const [searchParams] = useSearchParams();
  const [certNo, setCertNo] = useState("");
  const [state, setState] = useState<VerifyState>({ status: "idle" });
  const queryCertificateNumber = String(searchParams.get("certificateNumber") || "").trim().toUpperCase();

  const handleVerify = async (candidate?: string) => {
    const normalizedCertificateNumber = String(candidate ?? certNo).trim().toUpperCase();
    if (!normalizedCertificateNumber) {
      setState({ status: "idle" });
      return;
    }

    try {
      setState({ status: "loading" });
      const payload = await certificateAPI.verify(normalizedCertificateNumber);
      if (!payload?.valid) {
        setState({
          status: "notfound",
          message: "Nomor sertifikat tidak ditemukan.",
        });
        return;
      }
      setState({ status: "found", payload });
    } catch (err) {
      setState({
        status: "notfound",
        message: err instanceof Error ? err.message : "Nomor sertifikat tidak ditemukan.",
      });
    }
  };

  useEffect(() => {
    if (!queryCertificateNumber) return;
    setCertNo(queryCertificateNumber);
    void handleVerify(queryCertificateNumber);
  }, [queryCertificateNumber]);

  const foundPayload = state.status === "found" ? state.payload : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] pt-16">
      <div className="mx-auto w-full max-w-lg px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10">
            <Shield className="h-8 w-8 text-yellow-500" />
          </div>
          <h1 className="mb-3 text-3xl text-white" style={{ fontWeight: 800 }}>Verifikasi Sertifikat</h1>
          <p className="mb-10 text-zinc-400" style={{ lineHeight: 1.7 }}>
            Masukkan nomor sertifikat untuk memverifikasi keaslian sertifikat NEWME.
          </p>

          <Card className="border-white/10 bg-[#18181b]">
            <CardContent className="p-6">
              <div className="mb-4 flex gap-2">
                <input
                  value={certNo}
                  onChange={(e) => {
                    setCertNo(e.target.value.toUpperCase());
                    if (state.status !== "idle") setState({ status: "idle" });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void handleVerify()}
                  placeholder="Contoh: NMC-2026-U123456"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-500/50"
                />
                <Button className="bg-yellow-500 text-black hover:bg-yellow-400" onClick={() => void handleVerify()} disabled={state.status === "loading"}>
                  {state.status === "loading" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Search className="mr-1 h-4 w-4" />}
                  Verifikasi
                </Button>
              </div>

              {state.status === "found" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-left">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="text-sm text-green-500" style={{ fontWeight: 600 }}>Sertifikat Valid</p>
                      <p className="text-xs text-green-500/70">{foundPayload?.certificateNumber || certNo.toUpperCase()} terverifikasi dan sah.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Badge className="justify-start border-green-500/20 bg-green-500/5 text-green-200">Nama: {foundPayload?.userName || foundPayload?.user?.fullName || "-"}</Badge>
                    <Badge className="justify-start border-green-500/20 bg-green-500/5 text-green-200">Jenis: {foundPayload?.certType || foundPayload?.certificateType || foundPayload?.type || "-"}</Badge>
                  </div>
                </motion.div>
              )}

              {state.status === "notfound" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-left">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-6 w-6 text-red-500" />
                    <div>
                      <p className="text-sm text-red-500" style={{ fontWeight: 600 }}>Tidak Ditemukan</p>
                      <p className="text-xs text-red-500/70">{state.message}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
