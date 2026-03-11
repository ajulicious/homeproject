'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createSupabaseClient } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { toast } from 'sonner'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, MoreVertical } from "lucide-react"

type Category = Database['public']['Tables']['categories']['Row']
type Task = Database['public']['Tables']['tasks']['Row'] & { planned_weeks: number[] | null }

type CategoryWithTasks = Category & {
    tasks: Task[]
}

const WEEKS = [1, 2, 3, 4, 5, 6]

export default function PlannerPage() {
    const [data, setData] = useState<CategoryWithTasks[]>([])
    const [loading, setLoading] = useState(true)
    const [savingTaskIds, setSavingTaskIds] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Dialog States
    const [categoryModal, setCategoryModal] = useState<{ open: boolean, data: Partial<Category> | null }>({ open: false, data: null })
    const [taskModal, setTaskModal] = useState<{ open: boolean, categoryId: string, data: Partial<Task> | null }>({ open: false, categoryId: '', data: null })
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean, type: 'category' | 'task', id: string, title: string }>({ open: false, type: 'category', id: '', title: '' })

    const supabase = createSupabaseClient()

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: categoriesData, error: catError } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .order('order_index', { ascending: true })

            if (catError) throw catError
            const categories = categoriesData as Category[]

            const { data: tasksData, error: taskError } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)

            if (taskError) throw taskError
            const tasks = tasksData as Task[]

            const finalData: CategoryWithTasks[] = categories.map((cat) => ({
                ...cat,
                tasks: tasks.filter((t) => t.category_id === cat.id)
            }))

            setData(finalData)
        } catch (error) {
            console.error("Error fetching planner data:", error)
            toast.error("Gagal memuat data planner")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const togglePlannedWeek = async (task: Task, week: number) => {
        const currentPlanned = task.planned_weeks || []
        let newPlanned: number[] = []

        if (currentPlanned.includes(week)) {
            newPlanned = currentPlanned.filter(w => w !== week)
        } else {
            newPlanned = [...currentPlanned, week].sort((a, b) => a - b)
        }

        // Optimistic UI Update
        const newData = data.map(cat => {
            if (cat.id !== task.category_id) return cat
            return {
                ...cat,
                tasks: cat.tasks.map(t => {
                    if (t.id !== task.id) return t
                    return { ...t, planned_weeks: newPlanned }
                })
            }
        })
        setData(newData)

        setSavingTaskIds(prev => [...prev, task.id])

        try {
            const updateData: Database['public']['Tables']['tasks']['Update'] = {
                planned_weeks: newPlanned
            }
            const { error } = await supabase
                .from('tasks')
                // @ts-ignore
                .update(updateData)
                .eq('id', task.id)

            if (error) throw error
        } catch (error) {
            console.error('Save error', error)
            toast.error("Gagal menyimpan rencana jadwal")
            // Rollback on fail
            fetchData()
        } finally {
            setSavingTaskIds(prev => prev.filter(id => id !== task.id))
        }
    }

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        const title = (e.target as any).title.value
        if (!title) return toast.error("Judul kategori tidak boleh kosong")

        setIsSubmitting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Unauthorized")

            if (categoryModal.data?.id) {
                const { error } = await supabase
                    .from('categories')
                    // @ts-ignore
                    .update({ title })
                    .eq('id', categoryModal.data.id)
                if (error) throw error
                toast.success("Kategori berhasil diperbarui")
            } else {
                const { error } = await supabase
                    .from('categories')
                    // @ts-ignore
                    .insert({ title, order_index: data.length, user_id: user.id })
                if (error) throw error
                toast.success("Kategori baru berhasil ditambahkan")
            }
            setCategoryModal({ open: false, data: null })
            fetchData()
        } catch (error) {
            toast.error("Gagal menyimpan kategori")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault()
        const title = (e.target as any).title.value
        if (!title) return toast.error("Nama pekerjaan tidak boleh kosong")

        setIsSubmitting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Unauthorized")

            if (taskModal.data?.id) {
                const { error } = await supabase
                    .from('tasks')
                    // @ts-ignore
                    .update({ title })
                    .eq('id', taskModal.data.id)
                if (error) throw error
                toast.success("Pekerjaan berhasil diperbarui")
            } else {
                const { error } = await supabase
                    .from('tasks')
                    // @ts-ignore
                    .insert({
                        title,
                        category_id: taskModal.categoryId,
                        status_type: 'checkbox', // default
                        user_id: user.id
                    })
                if (error) throw error
                toast.success("Pekerjaan baru berhasil ditambahkan")
            }
            setTaskModal({ open: false, categoryId: '', data: null })
            fetchData()
        } catch (error) {
            toast.error("Gagal menyimpan pekerjaan")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        setIsSubmitting(true)
        try {
            const table = deleteConfirm.type === 'category' ? 'categories' : 'tasks'
            const { error } = await supabase.from(table).delete().eq('id', deleteConfirm.id)
            if (error) throw error
            toast.success(`${deleteConfirm.type === 'category' ? 'Kategori' : 'Pekerjaan'} berhasil dihapus`)
            setDeleteConfirm({ open: false, type: 'category', id: '', title: '' })
            fetchData()
        } catch (error) {
            toast.error("Gagal menghapus data")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-none shadow-md rounded-2xl">
                    <CardContent className="p-12 text-center text-muted-foreground animate-pulse">
                        Memuat data planner timeline...
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-600 mb-2">
                            Konfigurasi Jadwal
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900 leading-tight">
                            Timeline Planner
                        </h1>
                        <p className="text-lg text-neutral-600 max-w-2xl font-medium">
                            Tentukan target waktu penyelesaian (Minggu 1-6) untuk setiap rincian pekerjaan konstruksi.
                        </p>
                    </div>
                    <Button
                        onClick={() => setCategoryModal({ open: true, data: null })}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 shadow-md shadow-blue-100"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Kategori
                    </Button>
                </div>
            </header>

            <Card className="border-none shadow-lg overflow-hidden bg-white rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-neutral-50/80 text-neutral-600 uppercase font-semibold text-xs border-b">
                            <tr>
                                <th className="px-6 py-5 rounded-tl-2xl w-1/3">Kategori & Pekerjaan</th>
                                {WEEKS.map(w => (
                                    <th key={`h-${w}`} className="px-2 py-5 text-center w-[10%] min-w-[70px]">M{w}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {data.map((category) => (
                                <React.Fragment key={category.id}>
                                    <tr className="bg-neutral-50/40">
                                        <td colSpan={7} className="px-6 py-4 font-bold text-neutral-800">
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-4 w-1 rounded-full bg-blue-500"></div>
                                                    {category.title}
                                                    <span className="ml-2 text-[10px] font-normal text-neutral-400 bg-white border px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        {category.tasks.length} {category.tasks.length === 1 ? 'Task' : 'Tasks'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-full text-neutral-400 hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => setTaskModal({ open: true, categoryId: category.id, data: null })}
                                                        title="Tambah Pekerjaan"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-full text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                        onClick={() => setCategoryModal({ open: true, data: category })}
                                                        title="Edit Kategori"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50"
                                                        onClick={() => setDeleteConfirm({ open: true, type: 'category', id: category.id, title: category.title })}
                                                        title="Hapus Kategori"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    {category.tasks.map((task) => (
                                        <tr key={task.id} className="hover:bg-neutral-50/50 transition-colors">
                                            <td className="px-6 py-4 pl-10 text-neutral-600 font-medium align-middle group">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300"></div>
                                                        <span>{task.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-full text-neutral-400 hover:text-emerald-600"
                                                            onClick={() => setTaskModal({ open: true, categoryId: category.id, data: task })}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-full text-neutral-400 hover:text-red-500"
                                                            onClick={() => setDeleteConfirm({ open: true, type: 'task', id: task.id, title: task.title })}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </td>
                                            {WEEKS.map(week => {
                                                const isPlanned = (task.planned_weeks || []).includes(week)
                                                const isSaving = savingTaskIds.includes(task.id)
                                                return (
                                                    <td key={`c-${task.id}-${week}`} className="px-2 py-3 text-center align-middle">
                                                        <div
                                                            onClick={() => !isSaving && togglePlannedWeek(task, week)}
                                                            className={`w-full h-11 border-2 border-dashed rounded-lg transition-all cursor-pointer flex items-center justify-center 
                                                                ${isPlanned ? 'bg-blue-100 border-blue-400 text-blue-700 shadow-inner' : 'bg-transparent border-neutral-200 text-neutral-300 hover:border-blue-300 hover:bg-neutral-50'}
                                                                ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                                                            `}
                                                        >
                                                            {isPlanned ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                                            ) : (
                                                                <span className="text-[10px] font-medium">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Category Dialog */}
            <Dialog open={categoryModal.open} onOpenChange={(o) => !o && setCategoryModal({ open: false, data: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{categoryModal.data?.id ? 'Edit Kategori' : 'Tambah Kategori Baru'}</DialogTitle>
                        <DialogDescription>
                            Tentukan judul kategori utama untuk rincian pekerjaan.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveCategory} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Nama Kategori</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="Contoh: Pekerjaan Lantai"
                                defaultValue={categoryModal.data?.title || ''}
                                autoFocus
                                disabled={isSubmitting}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setCategoryModal({ open: false, data: null })} disabled={isSubmitting}>Batal</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Task Dialog */}
            <Dialog open={taskModal.open} onOpenChange={(o) => !o && setTaskModal({ open: false, categoryId: '', data: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{taskModal.data?.id ? 'Edit Pekerjaan' : 'Tambah Pekerjaan Baru'}</DialogTitle>
                        <DialogDescription>
                            Pastikan anda menambahkan pekerjaan ke kategori yang benar.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveTask} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Nama Pekerjaan</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="Contoh: Pasang Marmer Foyer"
                                defaultValue={taskModal.data?.title || ''}
                                autoFocus
                                disabled={isSubmitting}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setTaskModal({ open: false, categoryId: '', data: null })} disabled={isSubmitting}>Batal</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Pekerjaan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm({ open: false, type: 'category', id: '', title: '' })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-500">Konfirmasi Hapus</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus {deleteConfirm.type === 'category' ? 'kategori' : 'pekerjaan'} <b>"{deleteConfirm.title}"</b>?
                            {deleteConfirm.type === 'category' && (
                                <p className="mt-2 text-red-500 font-semibold text-xs animate-pulse">
                                    PENTING: Menghapus kategori juga akan menghapus seluruh daftar pekerjaan di dalamnya!
                                </p>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2">
                        <Button variant="ghost" onClick={() => setDeleteConfirm({ open: false, type: 'category', id: '', title: '' })} disabled={isSubmitting}>Batal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                            {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
