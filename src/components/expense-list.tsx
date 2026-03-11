'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { createSupabaseClient } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

type Expense = Database['public']['Tables']['expenses']['Row']

export function ExpenseList({ refreshKey }: { refreshKey: number }) {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    // Edit & Delete States
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null)
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form Edit States
    const [editType, setEditType] = useState<string>('material_purchase')
    const [editAmount, setEditAmount] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editReceiptFile, setEditReceiptFile] = useState<File | null>(null)

    const supabase = createSupabaseClient()

    useEffect(() => {
        const fetchExpenses = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('expenses')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) throw error
                setExpenses(data as Expense[])
            } catch (error) {
                console.error("Error fetching expenses:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchExpenses()

        const channel = supabase.channel('expenses_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'expenses' },
                () => {
                    fetchExpenses()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [refreshKey, supabase])

    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val)
    }

    const openEditModal = (expense: Expense) => {
        setExpenseToEdit(expense)
        setEditType(expense.type)
        setEditAmount(new Intl.NumberFormat('id-ID').format(expense.amount))
        setEditDescription(expense.description || '')
        setEditReceiptFile(null)
    }

    const handleEditAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '')
        if (!val) {
            setEditAmount('')
            return
        }
        setEditAmount(new Intl.NumberFormat('id-ID').format(Number(val)))
    }

    const handleUpdateExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!expenseToEdit) return
        if (!editAmount || !editDescription) {
            toast.error('Harap isi nominal dan keterangan')
            return
        }

        setIsSubmitting(true)
        toast.info('Memperbarui pengeluaran...')

        try {
            let receipt_image_url = expenseToEdit.receipt_image_url

            if (editReceiptFile) {
                if (editReceiptFile.size > 5 * 1024 * 1024) throw new Error("Ukuran maksimal nota 5MB")
                const fileExt = editReceiptFile.name.split('.').pop()
                const fileName = `receipt-${Date.now()}-${Math.random()}.${fileExt}`

                const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, editReceiptFile)
                if (uploadError) throw uploadError

                const { data } = supabase.storage.from('receipts').getPublicUrl(fileName)
                receipt_image_url = data.publicUrl
            }

            const numericAmount = parseInt(editAmount.replace(/\D/g, ''), 10)

            const { error: dbError } = await supabase
                .from('expenses')
                // @ts-ignore
                .update({
                    type: editType,
                    amount: numericAmount,
                    description: editDescription,
                    receipt_image_url
                })
                .eq('id', expenseToEdit.id)

            if (dbError) throw dbError

            toast.success('Pengeluaran berhasil diperbarui')
            setExpenseToEdit(null)
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Gagal memperbarui data')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteExpense = async () => {
        if (!expenseToDelete) return
        setIsSubmitting(true)
        toast.info('Menghapus data...')

        try {
            const { error } = await supabase.from('expenses').delete().eq('id', expenseToDelete.id)
            if (error) throw error
            toast.success('Pengeluaran berhasil dihapus')
            setExpenseToDelete(null)
        } catch (error: any) {
            console.error(error)
            toast.error('Gagal menghapus data')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <Card className="border-none shadow-md">
                <CardContent className="p-8 text-center text-muted-foreground animate-pulse">
                    Memuat riwayat pengeluaran...
                </CardContent>
            </Card>
        )
    }

    if (expenses.length === 0) {
        return (
            <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center text-muted-foreground">
                    Belum ada catatan pengeluaran.
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-3 mt-2">
                {expenses.map((expense) => (
                    <Card key={expense.id} className="border border-neutral-100 shadow-sm rounded-xl p-4 bg-white">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col gap-1.5 pr-4">
                                <span className="font-bold text-neutral-800 text-sm leading-tight">{expense.description}</span>
                                <span className="text-xs text-neutral-500 font-medium">
                                    {new Date(expense.created_at).toLocaleDateString('id-ID', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <span className="font-black text-neutral-900 text-[15px] whitespace-nowrap">
                                {formatRupiah(expense.amount)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-neutral-100/80">
                            <Badge variant={expense.type === 'material_purchase' ? 'default' : 'secondary'} className={`text-[10px] font-semibold ${expense.type === 'material_purchase' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                {expense.type === 'material_purchase' ? 'Material' : 'Jasa/Tukang'}
                            </Badge>
                            <div className="flex items-center gap-1.5 ml-auto">
                                {expense.receipt_image_url && (
                                    <button
                                        type="button"
                                        onClick={() => setPreviewImage(expense.receipt_image_url)}
                                        className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md hover:bg-amber-100 transition-colors mr-1"
                                    >
                                        Nota
                                    </button>
                                )}
                                <button
                                    onClick={() => openEditModal(expense)}
                                    className="h-7 w-7 flex items-center justify-center rounded-md bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                </button>
                                <button
                                    onClick={() => setExpenseToDelete(expense)}
                                    className="h-7 w-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                </button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Desktop View */}
            <Card className="hidden md:block border-none shadow-md overflow-hidden bg-white rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-neutral-50/80 text-neutral-600 font-semibold text-xs border-b">
                            <tr>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Keterangan</th>
                                <th className="px-6 py-4 text-left">Jenis</th>
                                <th className="px-6 py-4 text-right">Nominal</th>
                                <th className="px-6 py-4 text-center">Nota</th>
                                <th className="px-3 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                                        {new Date(expense.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-neutral-800">
                                        {expense.description}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={expense.type === 'material_purchase' ? 'default' : 'secondary'} className={expense.type === 'material_purchase' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}>
                                            {expense.type === 'material_purchase' ? 'Material' : 'Jasa/Tukang'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-neutral-900 whitespace-nowrap">
                                        {formatRupiah(expense.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {expense.receipt_image_url ? (
                                            <button
                                                type="button"
                                                onClick={() => setPreviewImage(expense.receipt_image_url)}
                                                className="text-xs font-semibold text-amber-600 hover:text-amber-800 bg-amber-50 px-3 py-1.5 rounded-md"
                                            >
                                                Lihat Nota
                                            </button>
                                        ) : (
                                            <span className="text-xs text-neutral-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openEditModal(expense)}
                                                className="h-8 w-8 flex items-center justify-center rounded-md bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => setExpenseToDelete(expense)}
                                                className="h-8 w-8 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Image Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Preview Nota</DialogTitle>
                        <DialogDescription className="hidden">Melihat nota secara lebih detail</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center items-center p-2">
                        {previewImage && (
                            <img
                                src={previewImage}
                                alt="Preview Nota"
                                className="max-w-full max-h-[75vh] object-contain rounded-md"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!expenseToEdit} onOpenChange={(o) => (!o && !isSubmitting) && setExpenseToEdit(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Pengeluaran</DialogTitle>
                        <DialogDescription>Perbarui nominal, keterangan, atau unggah ulang nota.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateExpense} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-type">Kategori</Label>
                            <Select value={editType} onValueChange={setEditType} disabled={isSubmitting}>
                                <SelectTrigger id="edit-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="material_purchase">Pembelian Material</SelectItem>
                                    <SelectItem value="labor_cost">Pembayaran Jasa/Tukang</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-amount">Nominal (Rp)</Label>
                            <Input
                                id="edit-amount"
                                value={editAmount}
                                onChange={handleEditAmountChange}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-desc">Keterangan</Label>
                            <Input
                                id="edit-desc"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2 pt-2">
                            <Label htmlFor="edit-receipt">Ganti Foto Nota (Opsional)</Label>
                            {expenseToEdit?.receipt_image_url && !editReceiptFile && (
                                <div className="mb-2 w-full h-24 border rounded-md relative overflow-hidden group">
                                    <img src={expenseToEdit.receipt_image_url} alt="Current receipt" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-xs font-medium">Nota Saat Ini</span>
                                    </div>
                                </div>
                            )}
                            <Input
                                id="edit-receipt"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setEditReceiptFile(e.target.files?.[0] || null)}
                                disabled={isSubmitting}
                                className="cursor-pointer"
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setExpenseToEdit(null)} disabled={isSubmitting}>Batal</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!expenseToDelete} onOpenChange={(o) => (!o && !isSubmitting) && setExpenseToDelete(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-500">Hapus Pengeluaran</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus data <b>"{expenseToDelete?.description}"</b> sebesar <b>{expenseToDelete ? formatRupiah(expenseToDelete.amount) : ''}</b>?
                            <br /><br />
                            Tindakan ini tidak dapat dibatalkan. Total pengeluaran Anda juga akan berkurang.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setExpenseToDelete(null)} disabled={isSubmitting}>Batal</Button>
                        <Button type="button" variant="destructive" onClick={handleDeleteExpense} disabled={isSubmitting}>
                            {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
