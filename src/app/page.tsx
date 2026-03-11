import { ProgressMatrix } from "@/components/progress-matrix"

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">Timeline Pekerjaan</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1 font-medium">
          Monitor progress mingguan dan upload bukti lapangan.
        </p>
      </div>

      <ProgressMatrix />
    </div>
  )
}
