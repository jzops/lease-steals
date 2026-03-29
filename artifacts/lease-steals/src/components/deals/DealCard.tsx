import { Share, Zap, Tag, Car, MapPin, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Deal } from "@workspace/api-client-react"
import { formatCurrency, cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

interface DealCardProps {
  deal: Deal
  onClick: (deal: Deal) => void
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const { toast } = useToast()
  
  const score = deal.dealScore
  let scoreVariant: "default" | "destructive" | "warning" = "default"
  if (score > 1.0) scoreVariant = "destructive"
  else if (score > 0.75) scoreVariant = "warning"

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}?deal=${deal.id}`
    const shareText = `Check out this ${deal.year} ${deal.make} ${deal.model} lease — ${formatCurrency(deal.monthlyPayment)}/mo${deal.moneyDown === 0 ? " with $0 down" : ""}! 🔥`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${deal.year} ${deal.make} ${deal.model} Lease Deal`, text: shareText, url: shareUrl })
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      toast({ title: "Link Copied!", description: "Deal link copied to clipboard.", variant: "success" })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card 
        onClick={() => onClick(deal)}
        className={cn(
          "group h-full cursor-pointer transition-all duration-300 flex flex-col",
          deal.isSignAndDrive 
            ? "border-primary/40 shadow-[0_0_20px_hsl(142_71%_45%_/_0.1)] hover:shadow-[0_0_30px_hsl(142_71%_45%_/_0.2)]" 
            : "hover:border-primary/30 hover:shadow-xl"
        )}
      >
        <div className="relative aspect-[16/9] w-full bg-secondary overflow-hidden">
          <img 
            src={deal.imageUrl || `${import.meta.env.BASE_URL}images/car-placeholder.png`} 
            alt={`${deal.make} ${deal.model}`}
            className="object-cover w-full h-full opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500"
          />
          {deal.isSignAndDrive && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-primary text-primary-foreground border-none font-bold px-3 py-1 shadow-lg flex items-center gap-1">
                <Zap className="h-3 w-3 fill-current" /> Sign & Drive
              </Badge>
            </div>
          )}
          <button 
            onClick={handleShare}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 backdrop-blur-md p-2 rounded-full text-white transition-colors"
          >
            <Share className="h-4 w-4" />
          </button>
        </div>

        <CardContent className="flex-1 p-5 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
                <Car className="h-3 w-3" /> {deal.carType}
              </div>
              <h3 className="font-display text-xl font-bold line-clamp-1">
                {deal.make} {deal.model}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {deal.year} {deal.trimLevel ? `· ${deal.trimLevel}` : ''}
              </p>
            </div>
            <Badge variant={scoreVariant} className="flex-shrink-0 text-sm">
              {score.toFixed(2)}% MSRP
            </Badge>
          </div>

          <div className="mt-4 mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-display font-bold text-foreground">
                {formatCurrency(deal.monthlyPayment)}
              </span>
              <span className="text-muted-foreground text-sm font-medium">/mo</span>
            </div>
            <p className="text-sm font-medium text-foreground mt-1">
              {formatCurrency(deal.moneyDown)} Due at Signing
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6 flex-1 content-start">
            <div className="flex flex-col gap-1 bg-secondary/50 rounded-lg p-2.5 border border-border/50">
              <span className="text-xs text-muted-foreground font-semibold">MSRP</span>
              <span className="text-sm font-bold">{formatCurrency(deal.msrp)}</span>
            </div>
            <div className="flex flex-col gap-1 bg-secondary/50 rounded-lg p-2.5 border border-border/50">
              <span className="text-xs text-muted-foreground font-semibold">Terms</span>
              <span className="text-sm font-bold">{deal.termMonths}mo / {deal.mileageLimit.toLocaleString()} mi/yr</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
            <div className="flex items-center text-xs text-muted-foreground font-medium">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              {deal.region}
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-primary font-semibold hover:text-primary hover:bg-primary/10">
              View Details <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
