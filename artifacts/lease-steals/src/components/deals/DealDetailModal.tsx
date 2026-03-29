import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Deal } from "@workspace/api-client-react"
import { formatCurrency } from "@/lib/utils"
import { Zap, Calendar, MapPin, Gauge, Tag, ExternalLink, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DealDetailModalProps {
  deal: Deal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DealDetailModal({ deal, open, onOpenChange }: DealDetailModalProps) {
  const { toast } = useToast()

  if (!deal) return null

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}?deal=${deal.id}`
    const text = `Check out this ${deal.year} ${deal.make} ${deal.model} lease deal — only ${formatCurrency(deal.monthlyPayment)}/mo${deal.moneyDown === 0 ? " with $0 down" : ""}! 🔥 via LeaseSteals`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${deal.year} ${deal.make} ${deal.model} Lease Deal`, text, url: shareUrl })
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      toast({ description: "Deal link copied to clipboard!" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border">
        <div className="relative h-64 w-full bg-secondary">
          <img 
            src={deal.imageUrl || `${import.meta.env.BASE_URL}images/car-placeholder.png`} 
            alt={`${deal.make} ${deal.model}`}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6">
            {deal.isSignAndDrive && (
              <Badge className="bg-primary text-primary-foreground border-none font-bold px-3 py-1 shadow-lg mb-3 flex items-center gap-1 w-fit">
                <Zap className="h-4 w-4 fill-current" /> Sign & Drive Qualified
              </Badge>
            )}
            <h2 className="text-3xl font-display font-bold text-white mb-1">
              {deal.year} {deal.make} {deal.model}
            </h2>
            <p className="text-muted-foreground font-medium">
              {deal.trimLevel ? `Trim: ${deal.trimLevel} • ` : ''}{deal.carType.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-border/50">
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">The Deal</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-foreground">
                  {formatCurrency(deal.monthlyPayment)}
                </span>
                <span className="text-muted-foreground font-medium">/month</span>
              </div>
              <p className="font-semibold mt-1">
                {deal.moneyDown === 0 ? (
                  <span className="text-primary flex items-center gap-1"><Zap className="h-4 w-4" /> $0 Due at Signing</span>
                ) : (
                  <span>{formatCurrency(deal.moneyDown)} Due at Signing</span>
                )}
              </p>
            </div>
            
            <div className="bg-secondary rounded-xl p-4 min-w-[140px] text-center border border-border/50 shadow-inner">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Deal Score</div>
              <div className={`text-2xl font-bold ${deal.dealScore < 0.75 ? 'text-primary' : deal.dealScore < 1.0 ? 'text-yellow-400' : 'text-red-400'}`}>
                {deal.dealScore.toFixed(2)}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Monthly % of MSRP</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-semibold">
                <Tag className="h-4 w-4" /> MSRP
              </div>
              <span className="font-bold">{formatCurrency(deal.msrp)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-semibold">
                <Calendar className="h-4 w-4" /> Term
              </div>
              <span className="font-bold">{deal.termMonths} Months</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-semibold">
                <Gauge className="h-4 w-4" /> Mileage
              </div>
              <span className="font-bold">{deal.mileageLimit.toLocaleString()} mi/yr</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-semibold">
                <MapPin className="h-4 w-4" /> Region
              </div>
              <span className="font-bold">{deal.region}</span>
            </div>
          </div>

          {deal.description && (
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Deal Notes</h4>
              <p className="text-sm leading-relaxed">{deal.description}</p>
            </div>
          )}

          <div className="flex gap-3">
            {deal.sourceUrl ? (
              <Button asChild className="flex-1" size="lg">
                <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer">
                  View Source Deal <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button className="flex-1 opacity-50 cursor-not-allowed" size="lg" disabled>
                Deal Source Unavailable
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
