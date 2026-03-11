'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { HardHat, ReceiptText, Image, CalendarClock, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSupabaseClient } from '@/lib/supabase'
import { signOut } from '@/app/auth/actions'
import { toast } from 'sonner'

export function Navbar() {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createSupabaseClient()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setLoading(false)
        }
        checkUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user || null)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    const handleSignOut = async () => {
        try {
            await signOut()
            toast.success("Berhasil keluar")
        } catch (error) {
            toast.error("Gagal keluar")
        }
    }
    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity">
                    <div className="bg-primary/10 p-2 rounded-xl">
                        <HardHat className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-tight leading-none text-foreground">Renovation</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tracker</span>
                    </div>
                </Link>
                <div className="flex items-center gap-1 sm:gap-2">
                    {user && (
                        <>
                            <Link href="/planner">
                                <Button variant="ghost" size="sm" className="gap-1.5 h-9 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    <CalendarClock className="h-4 w-4" />
                                    <span className="font-semibold hidden sm:inline-block">Planner</span>
                                </Button>
                            </Link>
                            <Link href="/gallery">
                                <Button variant="ghost" size="sm" className="gap-1.5 h-9 rounded-full text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                                    <Image className="h-4 w-4" />
                                    <span className="font-semibold hidden sm:inline-block">Galeri</span>
                                </Button>
                            </Link>
                            <Link href="/expenses">
                                <Button variant="outline" size="sm" className="gap-1.5 h-9 rounded-full shadow-sm">
                                    <ReceiptText className="h-4 w-4 text-emerald-600" />
                                    <span className="font-semibold text-emerald-700 hidden sm:inline-block">Pengeluaran</span>
                                </Button>
                            </Link>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleSignOut}
                                className="gap-1.5 h-9 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 ml-1"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="font-semibold hidden sm:inline-block">Keluar</span>
                            </Button>
                        </>
                    )}
                    {!user && !loading && (
                        <Link href="/login">
                            <Button size="sm" className="h-9 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all">
                                Login
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    )
}
