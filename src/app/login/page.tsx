'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login, signup, signInWithGoogle } from '@/app/auth/actions'
import { toast } from 'sonner'
import { Loader2, KeyRound, Mail } from 'lucide-react'

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [mode, setMode] = useState<'login' | 'signup'>('login')

    const handleGoogleLogin = async () => {
        setIsLoading(true)
        try {
            const result = await signInWithGoogle()
            if (result?.error) {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Gagal terhubung ke Google")
        } finally {
            setIsLoading(false)
        }
    }

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

                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-neutral-200"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-neutral-400 font-bold">Atau gunakan</span>
                            </div>
                        </div>

                        <Button 
                            type="button" 
                            variant="outline" 
                            disabled={isLoading}
                            onClick={handleGoogleLogin}
                            className="w-full h-14 rounded-2xl border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-base font-bold shadow-sm transition-all flex items-center justify-center gap-3"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
                            </svg>
                            Google
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
