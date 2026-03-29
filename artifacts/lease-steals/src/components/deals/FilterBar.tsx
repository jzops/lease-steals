import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DealCarType } from "@workspace/api-client-react"

interface FilterState {
  brand?: string
  carType?: string
  maxMonthly?: string
  sortBy?: string
}

interface FilterBarProps {
  filters: FilterState
  onFilterChange: (key: keyof FilterState, value: string | undefined) => void
}

const BRANDS = ["Toyota", "Honda", "Hyundai", "Tesla", "BMW", "Audi", "Mercedes", "Kia", "Ford", "Chevrolet"]
const MAX_PRICES = ["200", "300", "400", "500", "600", "800", "1000"]

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  return (
    <div className="bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl p-4 sticky top-20 z-30 shadow-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select 
          value={filters.brand || "all"} 
          onValueChange={(v) => onFilterChange("brand", v === "all" ? undefined : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {BRANDS.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.carType || "all"} 
          onValueChange={(v) => onFilterChange("carType", v === "all" ? undefined : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Body Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Body Types</SelectItem>
            {Object.values(DealCarType).map(t => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.maxMonthly || "all"} 
          onValueChange={(v) => onFilterChange("maxMonthly", v === "all" ? undefined : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Max Monthly: Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Monthly Payment</SelectItem>
            {MAX_PRICES.map(p => (
              <SelectItem key={p} value={p}>Under ${p}/mo</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.sortBy || "deal_score"} 
          onValueChange={(v) => onFilterChange("sortBy", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deal_score">Best Deal Score</SelectItem>
            <SelectItem value="monthly_payment">Lowest Payment</SelectItem>
            <SelectItem value="created_at">Newest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
