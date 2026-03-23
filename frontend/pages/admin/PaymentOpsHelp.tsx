// @ts-nocheck
import React, { useMemo } from 'react';
import { HelpCircle, ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { PAYMENT_OPS_HELP_TOPICS } from '../../lib/payment-ops';

export default function PaymentOpsHelp() {
  const location = useLocation();
  const activeTopic = useMemo(() => new URLSearchParams(location.search).get('topic') || '', [location.search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader
          icon={HelpCircle}
          title="Panduan Monitoring Pembayaran"
          description="Halaman ini membantu admin memahami arti alert pembayaran dan tindakan yang aman untuk dilakukan."
        />
        <Link to="/admin/payment-ops">
          <Button className="bg-yellow-400 text-black hover:bg-yellow-500">Kembali ke Monitoring Pembayaran</Button>
        </Link>
      </div>

      <Card className="border-yellow-400/20 bg-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">Cara menggunakan halaman ini</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-300">
          <p>Gunakan panduan ini saat kamu menemukan alert atau status pembayaran yang belum kamu pahami.</p>
          <p>Fokus utama admin adalah memastikan pembayaran user tidak tertinggal, mengetahui kapan cukup menunggu, dan kapan perlu meminta bantuan developer.</p>
          <p>Jika sebuah topik ditandai penting dan terus muncul berulang, sebaiknya segera eskalasi ke developer.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {PAYMENT_OPS_HELP_TOPICS.map((topic) => {
          const isActive = activeTopic === topic.key;
          return (
            <Card
              key={topic.key}
              id={topic.key}
              className={`border-yellow-400/20 bg-[#2a2a2a] ${isActive ? 'ring-2 ring-yellow-400/50' : ''}`}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-yellow-400">{topic.category}</p>
                    <CardTitle className="text-white">{topic.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-white">Apa artinya?</p>
                  <p className="mt-1 text-gray-300">{topic.shortMessage}</p>
                </div>
                <div>
                  <p className="font-medium text-white">Penjelasan</p>
                  <p className="mt-1 text-gray-300">{topic.detail}</p>
                </div>
                <div>
                  <p className="font-medium text-white">Apa yang harus admin lakukan?</p>
                  <p className="mt-1 text-gray-300">{topic.recommendedAction}</p>
                </div>
                <div>
                  <p className="font-medium text-white">Kapan perlu lapor developer?</p>
                  <p className="mt-1 text-gray-300">{topic.escalation}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
