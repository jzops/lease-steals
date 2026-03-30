import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Zap, MapPin } from "lucide-react"
import { motion } from "framer-motion"

interface ZipGateProps {
  onZipConfirmed: (zip: string) => void
}

export function ZipGate({ onZipConfirmed }: ZipGateProps) {
  const [zip, setZip] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{5}$/.test(zip)) {
      setError("Please enter a valid 5-digit ZIP code.")
      return
    }
    localStorage.setItem("leasesteals_zip", zip)
    onZipConfirmed(zip)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6"
    >
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 text-center max-w-sm w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-8">
          <Zap className="h-4 w-4 fill-current" /> LeaseSteals
        </div>

        <h2 className="text-4xl font-display font-extrabold mb-3 tracking-tight">
          Where are you shopping?
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Lease deals vary by region — manufacturer incentives, money factors, and dealer competition all change by ZIP. Enter yours to see what's available near you.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              inputMode="numeric"
              placeholder="ZIP Code"
              className="pl-11 h-14 rounded-2xl text-center text-xl font-bold tracking-[0.3em] bg-secondary/60"
              value={zip}
              onChange={(e) => {
                setError("")
                setZip(e.target.value.replace(/\D/g, "").slice(0, 5))
              }}
              maxLength={5}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="h-14 rounded-2xl text-base font-bold"
            disabled={zip.length !== 5}
          >
            Show Me Deals
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-5">
          Your ZIP is only used to filter deals — we don't store it on our servers.
        </p>
      </div>
    </motion.div>
  )
}
