'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { createSupabaseClient } from '@/lib/supabase'

type PhotoItem = {
    id: string
    imageUrl: string
    type: 'proof' | 'receipt'
    label: string
    subLabel: string
    week?: number
    date: string
}

export default function GalleryPage() {
    const [photos, setPhotos] = useState<PhotoItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'proof' | 'receipt'>('all')
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const supabase = createSupabaseClient()

    useEffect(() => {
        const fetchPhotos = async () => {
            setLoading(true)
            try {
                const items: PhotoItem[] = []

                // 1. Fetch proof images from progress_reports
                const { data: reports } = await supabase
                    .from('progress_reports')
                    .select('id, task_id, week, proof_image_url, updated_at')
                    .not('proof_image_url', 'is', null)
                    .order('updated_at', { ascending: false })

                const { data: tasks } = await supabase.from('tasks').select('id, title, category_id')
                const { data: categories } = await supabase.from('categories').select('id, title')

                const taskMap: Record<string, { title: string; categoryTitle: string }> = {}
                if (tasks && categories) {
                    const catMap: Record<string, string> = {}
                    categories.forEach((c: any) => { catMap[c.id] = c.title })
                    tasks.forEach((t: any) => {
                        taskMap[t.id] = { title: t.title, categoryTitle: catMap[t.category_id] || '' }
                    })
                }

                if (reports) {
                    reports.forEach((r: any) => {
                        const taskInfo = taskMap[r.task_id]
                        items.push({
                            id: `proof-${r.id}`,
                            imageUrl: r.proof_image_url,
                            type: 'proof',
                            label: taskInfo?.title || 'Pekerjaan',
                            subLabel: taskInfo?.categoryTitle || '',
                            week: r.week,
                            date: r.updated_at
                        })
                    })
                }

                // 2. Fetch receipt images from expenses
                const { data: expenses } = await supabase
                    .from('expenses')
                    .select('id, description, type, receipt_image_url, created_at')
                    .not('receipt_image_url', 'is', null)
                    .order('created_at', { ascending: false })

                if (expenses) {
                    expenses.forEach((e: any) => {
                        items.push({
                            id: `receipt-${e.id}`,
                            imageUrl: e.receipt_image_url,
                            type: 'receipt',
                            label: e.description,
                            subLabel: e.type === 'material_purchase' ? 'Material' : 'Jasa/Tukang',
                            date: e.created_at
                        })
                    })
                }

                // Sort by date descending
                items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                setPhotos(items)
            } catch (error) {
                console.error("Error fetching gallery:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchPhotos()
    }, [])

    const filteredPhotos = filter === 'all' ? photos : photos.filter(p => p.type === filter)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-4">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100/80 backdrop-blur border text-xs font-semibold text-neutral-600 mb-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                        </span>
                        Dokumentasi Visual
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900 leading-tight">
                        Galeri
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-400">
                            Bukti Kerja
                        </span>
                    </h1>
                    <p className="text-lg text-neutral-600 max-w-2xl font-medium">
                        Semua foto bukti lapangan dan nota pembelian dalam satu tempat.
                    </p>
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="rounded-full"
                >
                    Semua ({photos.length})
                </Button>
                <Button
                    variant={filter === 'proof' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('proof')}
                    className="rounded-full"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                    Bukti Lapangan ({photos.filter(p => p.type === 'proof').length})
                </Button>
                <Button
                    variant={filter === 'receipt' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('receipt')}
                    className="rounded-full"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></svg>
                    Nota ({photos.filter(p => p.type === 'receipt').length})
                </Button>
            </div>

            {/* Gallery Content */}
            {loading ? (
                <Card className="border-none shadow-md rounded-2xl">
                    <CardContent className="p-12 text-center text-muted-foreground animate-pulse">
                        Memuat galeri foto...
                    </CardContent>
                </Card>
            ) : filteredPhotos.length === 0 ? (
                <Card className="border-none shadow-md rounded-2xl">
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <div className="space-y-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-neutral-300"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                            <p className="font-medium">Belum ada foto yang diunggah.</p>
                            <p className="text-sm">Upload bukti lapangan dari halaman utama atau nota dari halaman pengeluaran.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {filteredPhotos.map((photo) => (
                        <div
                            key={photo.id}
                            className="group relative overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                            onClick={() => setPreviewImage(photo.imageUrl)}
                        >
                            <div className="aspect-square overflow-hidden">
                                <img
                                    src={photo.imageUrl}
                                    alt={photo.label}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                />
                            </div>
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                            {/* Badge */}
                            <div className="absolute top-2 left-2">
                                <Badge
                                    className={`text-[9px] font-bold shadow-sm ${photo.type === 'proof'
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-amber-500 text-white hover:bg-amber-600'
                                        }`}
                                >
                                    {photo.type === 'proof' ? 'Bukti' : 'Nota'}
                                    {photo.week ? ` M${photo.week}` : ''}
                                </Badge>
                            </div>

                            {/* Info overlay at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                                <p className="text-xs font-bold text-white leading-tight truncate">{photo.label}</p>
                                <p className="text-[10px] text-white/70 truncate">{photo.subLabel}</p>
                                <p className="text-[10px] text-white/50 mt-0.5">
                                    {new Date(photo.date).toLocaleDateString('id-ID', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Preview Foto</DialogTitle>
                        <DialogDescription className="hidden">Melihat foto secara lebih detail</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center items-center p-2">
                        {previewImage && (
                            <img
                                src={previewImage}
                                alt="Preview Foto"
                                className="max-w-full max-h-[80vh] object-contain rounded-md"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
