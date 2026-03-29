import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Car, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export interface TradeInInfo {
  vin: string
  year: string
  make: string
  model: string
  trim: string
  marketValue: number
  payoffAmount: number
}

interface NHTSAResult {
  Variable: string
  Value: string | null
}

interface TradeInPanelProps {
  tradeIn: TradeInInfo | null
  onChange: (info: TradeInInfo | null) => void
}

function getEquityLabel(equity: number) {
  if (equity > 0) return { label: `+${formatCurrency(equity)} equity`, color: "text-green-400", Icon: TrendingUp }
  if (equity < 0) return { label: `${formatCurrency(equity)} underwater`, color: "text-red-400", Icon: TrendingDown }
  return { label: "Break-even", color: "text-muted-foreground", Icon: Minus }
}

export function TradeInPanel({ tradeIn, onChange }: TradeInPanelProps) {
  const [vinInput, setVinInput] = useState(tradeIn?.vin ?? "")
  const [vehicle, setVehicle] = useState<Pick<TradeInInfo, "year" | "make" | "model" | "trim"> | null>(
    tradeIn ? { year: tradeIn.year, make: tradeIn.make, model: tradeIn.model, trim: tradeIn.trim } : null
  )
  const [marketValue, setMarketValue] = useState<string>(tradeIn?.marketValue ? String(tradeIn.marketValue) : "")
  const [payoffAmount, setPayoffAmount] = useState<string>(tradeIn?.payoffAmount ? String(tradeIn.payoffAmount) : "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mv = parseFloat(marketValue.replace(/,/g, "")) || 0
  const po = parseFloat(payoffAmount.replace(/,/g, "")) || 0
  const equity = mv - po
  const hasValues = mv > 0

  const lookupVin = async () => {
    const vin = vinInput.trim().toUpperCase()
    if (vin.length < 11) {
      setError("Please enter at least 11 characters of your VIN.")
      return
    }
    setLoading(true)
    setError(null)
    setVehicle(null)
    onChange(null)
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
      )
      if (!res.ok) throw new Error("Network error")
      const data = await res.json()
      const results: NHTSAResult[] = data.Results ?? []
      const get = (name: string) =>
        results.find((r) => r.Variable === name)?.Value?.trim() ?? ""

      const year = get("Model Year")
      const make = get("Make")
      const model = get("Model")
      const trim = get("Trim")

      if (!make || !model) {
        setError("VIN not recognized. Please check and try again.")
        return
      }

      setVehicle({ year, make, model, trim })

      if (mv > 0) {
        onChange({ vin, year, make, model, trim, marketValue: mv, payoffAmount: po })
      }
    } catch {
      setError("Could not look up VIN. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleValuesChange = (newMv: string, newPo: string) => {
    const mvNum = parseFloat(newMv.replace(/,/g, "")) || 0
    const poNum = parseFloat(newPo.replace(/,/g, "")) || 0
    if (vehicle && vinInput && mvNum > 0) {
      onChange({
        vin: vinInput.trim().toUpperCase(),
        ...vehicle,
        marketValue: mvNum,
        payoffAmount: poNum,
      })
    } else {
      onChange(null)
    }
  }

  const equityInfo = getEquityLabel(equity)

  return (
    <div className="bg-card/80 border border-primary/20 rounded-2xl p-5 mt-3 shadow-[0_0_30px_hsl(142_71%_45%_/_0.06)]">
      <div className="flex items-center gap-2 mb-4">
        <Car className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Your Current Lease</p>
        <span className="text-xs text-muted-foreground ml-auto">
          Positive equity lowers your effective monthly
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Enter VIN (e.g. 1HGCM82633A004352)"
          value={vinInput}
          onChange={(e) => setVinInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && lookupVin()}
          className="font-mono text-sm tracking-wider"
          maxLength={17}
        />
        <Button
          onClick={lookupVin}
          disabled={loading || vinInput.trim().length < 11}
          variant="outline"
          className="gap-2 shrink-0 border-primary/30 hover:border-primary text-primary"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Look Up
        </Button>
      </div>

      {error && <p className="text-xs text-destructive mb-3">{error}</p>}

      {vehicle && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-sm">
          <span className="font-semibold text-foreground">
            {vehicle.year} {vehicle.make} {vehicle.model}
            {vehicle.trim ? ` ${vehicle.trim}` : ""}
          </span>
          <span className="text-muted-foreground ml-2">· VIN verified</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Market Value ($)
          </label>
          <Input
            type="number"
            placeholder="e.g. 24000"
            value={marketValue}
            onChange={(e) => {
              setMarketValue(e.target.value)
              handleValuesChange(e.target.value, payoffAmount)
            }}
            className="text-sm"
            disabled={!vehicle}
          />
          <p className="text-xs text-muted-foreground mt-1">Check KBB or CarGurus for your car's value</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Remaining Lease Payoff ($)
          </label>
          <Input
            type="number"
            placeholder="e.g. 20000"
            value={payoffAmount}
            onChange={(e) => {
              setPayoffAmount(e.target.value)
              handleValuesChange(marketValue, e.target.value)
            }}
            className="text-sm"
            disabled={!vehicle}
          />
          <p className="text-xs text-muted-foreground mt-1">Residual + remaining payments owed</p>
        </div>
      </div>

      {hasValues && vehicle && (
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
          <equityInfo.Icon className={`h-4 w-4 ${equityInfo.color}`} />
          <span className={`text-sm font-bold ${equityInfo.color}`}>{equityInfo.label}</span>
          {equity !== 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              · spreads across new lease term
            </span>
          )}
        </div>
      )}
    </div>
  )
}
