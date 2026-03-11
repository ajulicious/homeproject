import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function AuthCodeError() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md shadow-2xl border-none bg-white rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="h-2 bg-red-500 w-full" />
        <CardHeader className="space-y-3 pt-10 pb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-black text-neutral-900">
                Otentikasi Gagal
            </CardTitle>
            <CardDescription className="text-neutral-500 font-medium px-4">
                Terjadi kesalahan saat memproses login Google Anda.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-8 pb-8 text-center">
            <p className="text-sm text-neutral-600 leading-relaxed">
                Beberapa kemungkinan penyebab:
            </p>
            <ul className="text-xs text-left text-neutral-500 space-y-2 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 italic">
                <li>• Link otentikasi sudah kadaluarsa.</li>
                <li>• Konfigurasi Redirect URL di Supabase belum sesuai.</li>
                <li>• Masalah koneksi sementara ke server Supabase/Google.</li>
            </ul>
        </CardContent>
        <CardFooter className="px-8 pb-12">
            <Link href="/login" className="w-full">
                <Button className="w-full h-12 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Login
                </Button>
            </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
