import { Link, useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Zap } from "lucide-react"

export function Navbar() {
  const [location] = useLocation()

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary/20 p-1.5 rounded-lg group-hover:bg-primary/30 transition-colors">
            <Zap className="h-5 w-5 text-primary fill-primary/20" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Lease<span className="text-primary">Steals</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            href="/admin" 
            className={`text-sm font-semibold transition-colors ${location === '/admin' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  )
}
