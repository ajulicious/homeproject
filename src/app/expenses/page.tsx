'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ExpenseForm } from '@/components/expense-form'
import { ExpenseList } from '@/components/expense-list'
import { createSupabaseClient } from '@/lib/supabase'

export default function ExpensesPage() {
    const [refreshKey, setRefreshKey] = useState(0)
    const [totalMaterial, setTotalMaterial] = useState(0)
    const [totalLabor, setTotalLabor] = useState(0)

    const handleExpenseAdded = () => {
        setRefreshKey(prev => prev + 1)
    }

    useEffect(() => {
        const fetchTotals = async () => {
            const supabase = createSupabaseClient()
            const { data } = await supabase.from('expenses').select('type, amount')
            if (data) {
                const materials = (data as { type: string, amount: number }[]).filter(e => e.type === 'material_purchase').reduce((acc, curr) => acc + Number(curr.amount), 0)
                const labors = (data as { type: string, amount: number }[]).filter(e => e.type === 'labor_cost').reduce((acc, curr) => acc + Number(curr.amount), 0)
                setTotalMaterial(materials)
                setTotalLabor(labors)
            }
        }
        fetchTotals()
    }, [refreshKey])

    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100/80 backdrop-blur border text-xs font-semibold text-neutral-600 mb-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            Tracking Keuangan
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900 leading-tight">
                            Buku
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-400">
                                Pengeluaran
                            </span>
                        </h1>
                        <p className="text-lg text-neutral-600 max-w-2xl font-medium">
                            Catat pembelian material dan upah tukang untuk pengawasan budget renovasi.
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* This section will contain the total metrics */}
                <Card className="border-none shadow-md bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-amber-50 font-medium">Total Pengeluaran</CardDescription>
                        <CardTitle className="text-3xl font-bold">{formatRupiah(totalMaterial + totalLabor)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium text-amber-100">Kumulatif seluruh biaya</div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="font-medium text-neutral-500">Material & Bahan</CardDescription>
                        <CardTitle className="text-2xl font-bold text-neutral-800">{formatRupiah(totalMaterial)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium text-neutral-400">Pembelian barang</div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="font-medium text-neutral-500">Jasa & Tukang</CardDescription>
                        <CardTitle className="text-2xl font-bold text-neutral-800">{formatRupiah(totalLabor)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium text-neutral-400">Pembayaran upah</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <ExpenseForm onExpenseAdded={handleExpenseAdded} />
                </div>
                <div className="lg:col-span-2">
                    <ExpenseList refreshKey={refreshKey} />
                </div>
            </div>

        </div>
    )
}
