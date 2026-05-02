import { useState, useEffect } from "react"
import { useListDeals, useSubscribe, Deal, ListDealsSortOrder, ListDealsSortBy, ListDealsCarType, ApiError } from "@workspace/api-client-react"
import { Navbar } from "@/components/layout/Navbar"
import { DealCard } from "@/components/deals/DealCard"
import { DealDetailModal } from "@/components/deals/DealDetailModal"
import { FilterBar } from "@/components/deals/FilterBar"
import { TradeInPanel, TradeInInfo } from "@/components/deals/TradeInPanel"
import { ZipGate } from "@/components/ZipGate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Mail, Loader2, Zap, Car, ArrowLeftRight, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { getStateFromZip, getStateNameFromZip } from "@/lib/zip-region"

export default function Home() {
  const { toast } = useToast()

  // ZIP state — restored from localStorage immediately
  const [userZip, setUserZip] = useState<string | null>(() =>
    localStorage.getItem("leasesteals_zip")
  )
  const [showZipGate, setShowZipGate] = useState<boolean>(() =>
    !localStorage.getItem("leasesteals_zip")
  )

  // Filter State
  const [filters, setFilters] = useState<{
    brand?: string
    carType?: string
    maxMonthly?: string
    sortBy?: string
  }>({})

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [email, setEmail] = useState("")

  // Trade-in state
  const [tradeInMode, setTradeInMode] = useState(false)
  const [tradeIn, setTradeIn] = useState<TradeInInfo | null>(null)

  // Resolve user's ZIP -> state code so the API can scope the result.
  const userState = userZip ? getStateFromZip(userZip) : null

  // Fetch Deals — state filter is now server-side: rows where state IS NULL
  // (national) OR state = userState are returned. No client-side filtering.
  const { data, isLoading, error } = useListDeals({
    limit: 100,
    page: 1,
    brand: filters.brand,
    carType: filters.carType as ListDealsCarType,
    maxMonthly: filters.maxMonthly ? Number(filters.maxMonthly) : undefined,
    state: userState ?? undefined,
    sortBy: (filters.sortBy as ListDealsSortBy) || ListDealsSortBy.deal_score,
    sortOrder: filters.sortBy === "created_at" ? ListDealsSortOrder.desc : ListDealsSortOrder.asc,
  })

  const visibleDeals = data?.deals ?? []

  // Restore trade-in from URL on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const vin = params.get("vin")
    const mv = parseFloat(params.get("mv") ?? "0")
    const po = parseFloat(params.get("po") ?? "0")
    const tveh = params.get("tveh") ?? ""

    if (vin && mv > 0 && tveh) {
      const parts = tveh.split(" ")
      const year = parts[0] ?? ""
      const make = parts[1] ?? ""
      const model = parts.slice(2).join(" ")
      setTradeIn({ vin, year, make, model, trim: "", marketValue: mv, payoffAmount: po })
      setTradeInMode(true)
    }
  }, [])

  // Deep-link: open deal modal from ?deal=<id>
  useEffect(() => {
    if (!data?.deals?.length) return
    const params = new URLSearchParams(window.location.search)
    const dealId = params.get("deal")
    if (!dealId) return
    const found = data.deals.find((d) => String(d.id) === dealId)
    if (found) setSelectedDeal(found)
  }, [data])

  // Sync trade-in info to URL for shareability
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (tradeIn && tradeIn.marketValue > 0) {
      params.set("vin", tradeIn.vin)
      params.set("mv", String(tradeIn.marketValue))
      params.set("po", String(tradeIn.payoffAmount))
      params.set("tveh", `${tradeIn.year} ${tradeIn.make} ${tradeIn.model}`)
    } else {
      params.delete("vin")
      params.delete("mv")
      params.delete("po")
      params.delete("tveh")
    }
    const newSearch = params.toString()
    const newUrl = `${window.location.pathname}${newSearch ? "?" + newSearch : ""}`
    window.history.replaceState(null, "", newUrl)
  }, [tradeIn])

  // Subscribe Mutation
  const subscribeMutation = useSubscribe({
    mutation: {
      onSuccess: () => {
        toast({ title: "Subscribed!", description: "You'll be notified of new deals.", variant: "success" })
        setEmail("")
      },
      onError: (err: ApiError<unknown>) => {
        toast({ title: "Subscription failed", description: err.message || "Please try again.", variant: "destructive" })
      },
    },
  })

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    subscribeMutation.mutate({ data: { email } })
  }

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleToggleTradeIn = () => {
    setTradeInMode((prev) => !prev)
    if (tradeInMode) setTradeIn(null)
  }

  const handleZipConfirmed = (zip: string) => {
    setUserZip(zip)
    setShowZipGate(false)
  }

  const stateName = userZip ? getStateNameFromZip(userZip) : null

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* ZIP Gate overlay */}
      <AnimatePresence>
        {showZipGate && (
          <ZipGate onZipConfirmed={handleZipConfirmed} />
        )}
      </AnimatePresence>

      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 z-0">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Hero background"
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-6">
            <Zap className="h-4 w-4 fill-current" /> $0 Down. Under 1% MSRP.
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            Find Your Next <br />
            <span className="text-primary bg-none bg-transparent">Sign & Drive</span> Lease
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            We track the absolute best car lease deals in the US. No hidden fees, no massive down payments. Just killer deals you can drive off the lot today.
          </p>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row max-w-md mx-auto gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter your email"
                className="pl-10 h-14 rounded-2xl bg-secondary/80 border-border"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="lg" className="h-14 px-8 rounded-2xl" disabled={subscribeMutation.isPending}>
              {subscribeMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Get Alerts"}
            </Button>
          </form>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 -mt-8 relative z-20">
        {/* Location bar */}
        {userZip && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>
                Showing deals for <span className="font-semibold text-foreground">{userZip}{stateName ? ` · ${stateName}` : ""}</span>
                <span className="ml-1">({visibleDeals.length} available)</span>
              </span>
            </div>
            <button
              onClick={() => setShowZipGate(true)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Change ZIP
            </button>
          </div>
        )}

        <FilterBar filters={filters} onFilterChange={handleFilterChange} />

        {/* Trade-In Mode Toggle */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-1 bg-card/50 border border-border/50 rounded-full p-1 backdrop-blur-md shadow-sm">
            <button
              onClick={() => { setTradeInMode(false); setTradeIn(null) }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                !tradeInMode
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              Standard
            </button>
            <button
              onClick={handleToggleTradeIn}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                tradeInMode
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              With My Trade-In
            </button>
          </div>
          {tradeInMode && (
            <span className="text-xs text-muted-foreground">
              Deals adjust based on your current car's equity
            </span>
          )}
        </div>

        {/* Trade-In Panel */}
        <AnimatePresence>
          {tradeInMode && (
            <motion.div
              key="trade-in-panel"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <TradeInPanel tradeIn={tradeIn} onChange={setTradeIn} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8">
          {tradeInMode && tradeIn && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <Car className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                Showing effective monthly payments with your{" "}
                <span className="font-semibold text-foreground">
                  {tradeIn.year} {tradeIn.make} {tradeIn.model}
                </span>{" "}
                trade-in
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-20 text-destructive">
              Failed to load deals. Please try again later.
            </div>
          ) : visibleDeals.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-bold mb-2">No deals in your area yet</h3>
              <p className="text-muted-foreground mb-4">
                We don't have any deals for {userZip} right now — the scraper runs nightly and we're still growing coverage.
              </p>
              <Button variant="outline" onClick={() => setShowZipGate(true)}>
                Try a Different ZIP
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={setSelectedDeal}
                  tradeIn={tradeInMode ? tradeIn : null}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <DealDetailModal
        deal={selectedDeal}
        open={!!selectedDeal}
        onOpenChange={(o) => !o && setSelectedDeal(null)}
        tradeIn={tradeInMode ? tradeIn : null}
      />
    </div>
  )
}
