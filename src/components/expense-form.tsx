'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createSupabaseClient } from '@/lib/supabase'

export function ExpenseForm({ onExpenseAdded }: { onExpenseAdded?: () => void }) {
    const [isLoading, setIsLoading] = useState(false)
    const [type, setType] = useState<string>('material_purchase')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [receiptFile, setReceiptFile] = useState<File | null>(null)

    const supabase = createSupabaseClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!amount || !description) {
            toast.error('Harap isi nominal dan keterangan')
            return
        }

        setIsLoading(true)
        toast.info('Menyimpan data pengeluaran...')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Anda harus login untuk mencatat pengeluaran")

            let receipt_image_url = null

            // 1. Upload resi jika ada
            if (receiptFile) {
                if (receiptFile.size > 5 * 1024 * 1024) {
                    throw new Error("Ukuran maksimal nota 5MB")
                }
                const fileExt = receiptFile.name.split('.').pop()
                const fileName = `receipt-${Date.now()}-${Math.random()}.${fileExt}`
                const filePath = `${user.id}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(filePath, receiptFile)

                if (uploadError) throw uploadError

                const { data } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(filePath)

                receipt_image_url = data.publicUrl
            }

            // 2. Insert ke tabel expenses
            const numericAmount = parseInt(amount.replace(/\D/g, ''), 10)

            const { error: dbError } = await supabase
                .from('expenses')
                .insert({
                    type,
                    amount: numericAmount,
                    description,
                    receipt_image_url,
                    created_at: new Date().toISOString(),
                    user_id: user.id
                } as any)

            if (dbError) throw dbError

            toast.success('Pengeluaran berhasil dicatat')

            // Reset form
            setAmount('')
            setDescription('')
            setReceiptFile(null)

            // Trigger refresh or callback
            if (onExpenseAdded) onExpenseAdded()

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Gagal menyimpan data')
        } finally {
            setIsLoading(false)
        }
    }

    // Helper formatter rupiah
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '')
        if (!val) {
            setAmount('')
            return
        }
        const formatted = new Intl.NumberFormat('id-ID').format(Number(val))
        setAmount(formatted)
    }

    return (
        <Card className="border-none shadow-md">
            <CardHeader>
                <CardTitle className="text-xl">Catat Pengeluaran Beli/Tukang</CardTitle>
                <CardDescription>Masukkan detail dan nominal, lalu unggah nota opsional.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Kategori</Label>
                        <Select value={type} onValueChange={setType} disabled={isLoading}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Pilih Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="material_purchase">Pembelian Material</SelectItem>
                                <SelectItem value="labor_cost">Pembayaran Jasa/Tukang</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Nominal (Rp)</Label>
                        <Input
                            id="amount"
                            placeholder="Contoh: 1.500.000"
                            value={amount}
                            onChange={handleAmountChange}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="desc">Keterangan / Nama Barang</Label>
                        <Input
                            id="desc"
                            placeholder="Contoh: Besi Beton 10mm (50 batang)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2 pt-2">
                        <Label htmlFor="receipt">Foto Nota / Struk (Opsional)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="receipt"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                disabled={isLoading}
                                className="cursor-pointer"
                            />
                        </div>
                        {receiptFile && (
                            <p className="text-xs text-info text-neutral-500 mt-1">
                                {receiptFile.name} siap diunggah
                            </p>
                        )}
                    </div>

                    <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                        {isLoading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
