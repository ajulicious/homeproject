'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import { createSupabaseClient } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

type Category = Database['public']['Tables']['categories']['Row']
type Task = Database['public']['Tables']['tasks']['Row'] & { planned_weeks: number[] | null }
type ProgressReport = Database['public']['Tables']['progress_reports']['Row']

type TaskWithReports = Task & {
    reports: Record<number, ProgressReport> // key is week number (1-6)
}

type CategoryWithTasks = Category & {
    tasks: TaskWithReports[]
}

const WEEKS = [1, 2, 3, 4, 5, 6]

export function ProgressMatrix() {
    const [data, setData] = useState<CategoryWithTasks[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createSupabaseClient()

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Fetch Categories
            const { data: categoriesData, error: catError } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .order('order_index', { ascending: true })

            if (catError) throw catError
            const categories = categoriesData as Category[]

            // 2. Fetch Tasks
            const { data: tasksData, error: taskError } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)

            if (taskError) throw taskError
            const tasks = tasksData as Task[]

            // 3. Fetch Reports
            const { data: reportsData, error: reportError } = await supabase
                .from('progress_reports')
                .select('*')
                .eq('user_id', user.id)

            if (reportError) throw reportError
            const reports = reportsData as ProgressReport[]

            // Map reports by task_id and week
            const reportsMap: Record<string, Record<number, ProgressReport>> = {}
            if (reports) {
                reports.forEach((report) => {
                    if (!reportsMap[report.task_id]) {
                        reportsMap[report.task_id] = {}
                    }
                    reportsMap[report.task_id][report.week] = report
                })
            }

            // Combine Task with its Reports
            const tasksWithReports: TaskWithReports[] = tasks.map((task) => ({
                ...task,
                reports: reportsMap[task.id] || {}
            }))

            // Combine Category with its Tasks
            const finalData: CategoryWithTasks[] = categories.map((cat) => ({
                ...cat,
                tasks: tasksWithReports.filter((t) => t.category_id === cat.id)
            }))

            setData(finalData)
        } catch (error) {
            console.error("Error fetching matrix data:", error)
        } finally {
            setLoading(false)
        }
    }

    const [selectedTask, setSelectedTask] = useState<{ task: TaskWithReports, week: number } | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    useEffect(() => {
        fetchData()

        const channel = supabase.channel('matrix_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'progress_reports' },
                (payload) => {
                    toast.info('Ada pembaruan status progress!', { duration: 3000 })
                    fetchData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleStatusChange = async (newStatus: ProgressReport['status']) => {
        if (!selectedTask) return
        setIsUpdating(true)
        try {
            const { updateProgressStatus } = await import('@/lib/actions')
            await updateProgressStatus(selectedTask.task.id, selectedTask.week, newStatus)
            toast('Status berhasil diubah')
            await fetchData() // Refetch to get new status
        } catch (error) {
            toast.error('Gagal mengubah status')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedTask || !e.target.files?.[0]) return

        const file = e.target.files[0]
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ukuran maksimal gambar 5MB')
            return
        }

        setIsUpdating(true)
        toast.info('Mengunggah gambar...')
        try {
            const { uploadProofImage } = await import('@/lib/actions')
            await uploadProofImage(selectedTask.task.id, selectedTask.week, file)
            toast.success('Bukti lapangan berhasil diunggah')
            await fetchData()
        } catch (error) {
            toast.error('Gagal mengunggah gambar')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeletePhoto = async () => {
        if (!selectedTask) return
        const report = selectedTask.task.reports[selectedTask.week]
        if (!report?.proof_image_url) return

        setIsUpdating(true)
        toast.info('Menghapus foto...')
        try {
            const { removeProofImage } = await import('@/lib/actions')
            await removeProofImage(selectedTask.task.id, selectedTask.week, report.proof_image_url)
            toast.success('Foto bukti berhasil dihapus')
            await fetchData()
        } catch (error) {
            toast.error('Gagal menghapus foto')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleSaveNotes = async (notes: string) => {
        if (!selectedTask) return
        setIsUpdating(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Unauthorized")

            const { error } = await supabase
                .from('progress_reports')
                .upsert(
                    {
                        task_id: selectedTask.task.id,
                        week: selectedTask.week,
                        notes,
                        updated_at: new Date().toISOString(),
                        user_id: user.id
                    } as any,
                    { onConflict: 'task_id,week' }
                )
            if (error) throw error
            toast.success('Catatan tersimpan')
            await fetchData()
        } catch (error) {
            toast.error('Gagal menyimpan catatan')
        } finally {
            setIsUpdating(false)
        }
    }

    const renderStatusBlock = (task: TaskWithReports, week: number, isMobile: boolean = false) => {
        const report = task.reports[week]
        const status = report?.status || 'not_started'
        const isPlanned = (task.planned_weeks || []).includes(week)

        let bgColor = 'bg-neutral-100/50 hover:bg-neutral-200 border-transparent text-neutral-400'
        let text = ''

        if (status === 'done') {
            bgColor = 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white shadow-sm'
            text = 'Selesai'
        } else if (status === 'in_progress') {
            bgColor = 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-white shadow-sm'
            text = 'Aktif'
        } else if (isPlanned) {
            bgColor = 'bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 text-blue-600'
            text = 'Rencana'
        }

        return (
            <div
                key={`${task.id}-w${week}`}
                onClick={() => setSelectedTask({ task, week })}
                className={`w-full ${isMobile ? 'h-9 rounded-md' : 'h-11 rounded-lg'} border transition-all cursor-pointer flex items-center justify-center relative ${bgColor}`}
                title={`Minggu ${week} - ${text || 'Kosong'}`}
            >
                {/* Marker titik biru kecil di sudut untuk menandakan ini Planned Week yang sudah Selesai/Aktif */}
                {isPlanned && status !== 'not_started' && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white shadow-sm" title="Jadwal Rencana" />
                )}

                {isMobile ? (
                    status === 'done' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    ) : status === 'in_progress' ? (
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                        </span>
                    ) : isPlanned ? (
                        <span className="text-[10px] font-bold">M{week}</span>
                    ) : (
                        <span className="text-[10px] font-medium">-</span>
                    )
                ) : (
                    <span className="text-[10px] sm:text-xs font-semibold truncate px-1">
                        {text || '-'}
                    </span>
                )}
            </div>
        )
    }

    if (loading) {
        return (
            <Card className="border-none shadow-md rounded-2xl">
                <CardContent className="p-12 text-center text-muted-foreground animate-pulse">
                    Memuat data progress...
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-6">
                {data.map((category) => {
                    const totalTasks = category.tasks.length
                    const doneTasks = category.tasks.filter(t => Object.values(t.reports).some(r => r.status === 'done')).length
                    const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)

                    // Simple Delay Logic: Get max planned week for incomplete tasks. If < overall current week, it's delayed.
                    // Instead of full overall week, let's just check if there's any planned week in the past that isn't done
                    // Since we don't know "current wall-clock week", we assume highest week with any report across all tasks is current week.
                    let currentWeek = 1
                    data.forEach(c => c.tasks.forEach(t => Object.values(t.reports).forEach(r => {
                        if ((r.status === 'in_progress' || r.status === 'done') && r.week > currentWeek) currentWeek = r.week
                    })))

                    const isDelayed = category.tasks.some(t => {
                        const isDone = Object.values(t.reports).some(r => r.status === 'done')
                        if (isDone) return false
                        const planned = t.planned_weeks || []
                        const maxPlanned = planned.length > 0 ? Math.max(...planned) : 0
                        return maxPlanned > 0 && maxPlanned < currentWeek
                    })

                    return (
                        <div key={category.id} className="space-y-3">
                            <div className="flex flex-col gap-2 px-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-1 rounded-full bg-amber-500"></div>
                                        <h3 className="font-bold text-neutral-800 text-sm tracking-tight">{category.title}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isDelayed ? (
                                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">Delayed</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">On Track</Badge>
                                        )}
                                        <span className="text-xs font-bold text-neutral-600">{progress}%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-neutral-100 rounded-full h-1.5">
                                    <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                {category.tasks.map((task) => (
                                    <Card key={task.id} className="border border-neutral-100 shadow-sm rounded-xl overflow-hidden">
                                        <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-100 flex items-center">
                                            <span className="text-xs font-semibold text-neutral-700">{task.title}</span>
                                        </div>
                                        <div className="p-3 bg-white">
                                            <div className="grid grid-cols-6 gap-2">
                                                {WEEKS.map(week => (
                                                    <div key={`m-${task.id}-${week}`}>
                                                        {renderStatusBlock(task, week, true)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Desktop View */}
            <Card className="hidden md:block border-none shadow-lg overflow-hidden bg-white rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-neutral-50/80 text-neutral-600 uppercase font-semibold text-xs border-b">
                            <tr>
                                <th className="px-6 py-5 rounded-tl-2xl w-1/3">Kategori & Pekerjaan</th>
                                {WEEKS.map(w => (
                                    <th key={`h-${w}`} className="px-2 py-5 text-center w-[10%] min-w-[70px]">Minggu {w}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {data.map((category) => {
                                const totalTasks = category.tasks.length
                                const doneTasks = category.tasks.filter(t => Object.values(t.reports).some(r => r.status === 'done')).length
                                const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)

                                let currentWeek = 1
                                data.forEach(c => c.tasks.forEach(t => Object.values(t.reports).forEach(r => {
                                    if ((r.status === 'in_progress' || r.status === 'done') && r.week > currentWeek) currentWeek = r.week
                                })))

                                const isDelayed = category.tasks.some(t => {
                                    const isDone = Object.values(t.reports).some(r => r.status === 'done')
                                    if (isDone) return false
                                    const planned = t.planned_weeks || []
                                    const maxPlanned = planned.length > 0 ? Math.max(...planned) : 0
                                    return maxPlanned > 0 && maxPlanned < currentWeek
                                })

                                return (
                                    <React.Fragment key={category.id}>
                                        <tr className="bg-neutral-50/40">
                                            <td colSpan={7} className="px-6 py-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 font-bold text-neutral-800">
                                                        <div className="h-4 w-1 rounded-full bg-amber-500"></div>
                                                        {category.title}
                                                    </div>
                                                    <div className="flex items-center gap-4 w-1/3 max-w-[200px]">
                                                        <div className="flex-1">
                                                            <div className="w-full bg-neutral-200/60 rounded-full h-2">
                                                                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-neutral-600 w-8">{progress}%</span>
                                                        {isDelayed ? (
                                                            <Badge variant="destructive" className="text-[10px] w-[65px] justify-center">Delayed</Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-[10px] w-[65px] justify-center bg-emerald-100 text-emerald-700 hover:bg-emerald-200">On Track</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {category.tasks.map((task) => (
                                            <tr key={task.id} className="hover:bg-neutral-50/50 transition-colors">
                                                <td className="px-6 py-4 pl-10 text-neutral-600 font-medium align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300"></div>
                                                        <span>{task.title}</span>
                                                    </div>
                                                </td>
                                                {WEEKS.map(week => (
                                                    <td key={`c-${task.id}-${week}`} className="px-2 py-3 text-center align-middle">
                                                        {renderStatusBlock(task, week)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Progress Pekerjaan</DialogTitle>
                        <DialogDescription>
                            {selectedTask?.task.title} (Minggu {selectedTask?.week})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-4">
                        <div className="space-y-4">
                            <p className="text-sm font-medium">Ubah Status</p>
                            <div className="flex gap-2">
                                <Button
                                    variant={selectedTask?.task.reports[selectedTask.week]?.status === 'not_started' || !selectedTask?.task.reports[selectedTask.week]?.status ? 'default' : 'outline'}
                                    onClick={() => handleStatusChange('not_started')}
                                    disabled={isUpdating}
                                >
                                    Belum Mulai
                                </Button>
                                <Button
                                    className="bg-amber-500 hover:bg-amber-600 text-white"
                                    variant={selectedTask?.task.reports[selectedTask.week]?.status === 'in_progress' ? 'default' : 'outline'}
                                    onClick={() => handleStatusChange('in_progress')}
                                    disabled={isUpdating}
                                >
                                    Aktif (Progress)
                                </Button>
                                <Button
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                    variant={selectedTask?.task.reports[selectedTask.week]?.status === 'done' ? 'default' : 'outline'}
                                    onClick={() => handleStatusChange('done')}
                                    disabled={isUpdating}
                                >
                                    Selesai
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <p className="text-sm font-medium">Bukti Lapangan (Opsional)</p>

                            {selectedTask?.task.reports[selectedTask.week]?.proof_image_url ? (
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <img
                                            src={selectedTask.task.reports[selectedTask.week].proof_image_url || undefined}
                                            alt="Bukti Lapangan"
                                            className="w-full h-48 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => {
                                                if (selectedTask.task.reports[selectedTask.week].proof_image_url) {
                                                    setPreviewImage(selectedTask.task.reports[selectedTask.week].proof_image_url!)
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleDeletePhoto}
                                            disabled={isUpdating}
                                            className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-red-500/90 text-white shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Hapus foto"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                        </button>
                                    </div>
                                    <div className="text-xs text-muted-foreground text-center">
                                        Klik gambar untuk preview. Hover lalu klik 🗑️ untuk hapus.
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="proof-upload"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={isUpdating}
                                />
                                <label
                                    htmlFor="proof-upload"
                                    className={`w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-md p-4 hover:bg-neutral-50 cursor-pointer transition-colors ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <div className="text-sm font-medium text-neutral-600">
                                        {isUpdating ? 'Memproses...' : 'Klik untuk Unggah Foto'}
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="space-y-2 pt-4 border-t">
                            <p className="text-sm font-medium">Catatan Pekerjaan</p>
                            <textarea
                                className="w-full border rounded-md p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                                placeholder="Tulis catatan untuk minggu ini... (contoh: material belum datang, cuaca hujan, dll)"
                                defaultValue={selectedTask?.task.reports[selectedTask?.week || 1]?.notes || ''}
                                onBlur={(e) => handleSaveNotes(e.target.value)}
                                disabled={isUpdating}
                            />
                            <p className="text-[10px] text-muted-foreground">Catatan otomatis tersimpan saat Anda klik di luar kotak teks.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Image Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Preview Bukti Lapangan</DialogTitle>
                        <DialogDescription className="hidden">Melihat foto secara lebih detail</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center items-center p-2">
                        {previewImage && (
                            <img
                                src={previewImage}
                                alt="Preview Foto Bukti"
                                className="max-w-full max-h-[75vh] object-contain rounded-md shadow-sm border border-neutral-100"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
