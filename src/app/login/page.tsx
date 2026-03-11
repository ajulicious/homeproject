'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login, signup } from '@/app/auth/actions'
import { toast } from 'sonner'
import { Loader2, KeyRound, Mail } from 'lucide-react'

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [mode, setMode] = useState<'login' | 'signup'>('login')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)
        
        try {
            if (mode === 'login') {
                const result = await login(formData)
                if (result?.error) {
                    toast.error(result.error)
                }
            } else {
                const result = await signup(formData)
                if (result?.error) {
                    toast.error(result.error)
                } else if (result?.success) {
                    toast.success(result.success)
                }
            }
        } catch (error) {
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh] px-4">
            <Card className="w-full max-w-md shadow-2xl border-none bg-white rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="h-2 bg-blue-600 w-full" />
                <CardHeader className="space-y-3 pt-10 pb-6 text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-2">
                        <KeyRound className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight text-neutral-900">
                        {mode === 'login' ? 'Selamat Datang' : 'Buat Akun'}
                    </CardTitle>
                    <CardDescription className="text-neutral-500 font-medium text-lg px-6">
                        {mode === 'login' 
                            ? 'Masuk ke sistem Renovasi Tracker untuk memantau progress Anda.' 
                            : 'Daftarkan email Anda untuk mulai mengelola proyek.'}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6 px-8 pt-2 pb-8">
                        <div className="space-y-2.5">
                            <Label htmlFor="email" className="text-neutral-700 font-bold ml-1">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3 h-5 w-5 text-neutral-400" />
                                <Input 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    placeholder="nama@email.com" 
                                    required 
                                    className="pl-11 h-12 rounded-xl border-neutral-200 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <Label htmlFor="password" title="password" className="text-neutral-700 font-bold ml-1">Kata Sandi</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3.5 top-3 h-5 w-5 text-neutral-400" />
                                <Input 
                                    id="password" 
                                    name="password" 
                                    type="password" 
                                    required 
                                    className="pl-11 h-12 rounded-xl border-neutral-200 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-6 px-8 pb-12 pt-4">
                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold shadow-xl shadow-blue-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                mode === 'login' ? 'Masuk Sekarang' : 'Daftar Sekarang'
                            )}
                        </Button>
                        <p className="text-center text-sm text-neutral-500 font-medium">
                            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}
                            <button 
                                type="button" 
                                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                                className="ml-1.5 text-blue-600 font-bold hover:underline"
                            >
                                {mode === 'login' ? 'Daftar di sini' : 'Masuk di sini'}
                            </button>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
