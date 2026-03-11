import Link from 'next/link'
import { HardHat, ReceiptText, Image, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Navbar() {
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
                </div>
            </div>
        </nav>
    )
}
