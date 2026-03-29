import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import {
  useListDeals,
  useCreateDeal,
  useUpdateDeal,
  useDeleteDeal,
  getListDealsQueryKey,
  Deal,
  CreateDealRequestCarType,
  ApiError,
} from "@workspace/api-client-react"

import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { Plus, Edit, Trash2, Loader2, RefreshCw, Lock } from "lucide-react"

const carTypes = Object.values(CreateDealRequestCarType) as [string, ...string[]]

const formSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().int().min(2020),
  carType: z.enum(carTypes),
  msrp: z.coerce.number().positive("MSRP must be positive"),
  monthlyPayment: z.coerce.number().positive("Payment must be positive"),
  moneyDown: z.coerce.number().min(0).default(0),
  termMonths: z.coerce.number().int().positive(),
  mileageLimit: z.coerce.number().int().positive(),
  region: z.string().min(1, "Region is required"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  trimLevel: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

function AdminLogin({ onUnlock }: { onUnlock: (key: string) => void }) {
  const [inputKey, setInputKey] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputKey.trim()) {
      setError("Please enter the admin key.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": inputKey.trim() },
        body: JSON.stringify({}),
      })
      if (res.status === 401) {
        setError("Invalid admin key. Please try again.")
      } else {
        onUnlock(inputKey.trim())
      }
    } catch {
      setError("Connection error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary/20 p-3 rounded-xl mb-3">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold">Admin Access</h2>
          <p className="text-sm text-muted-foreground mt-1 text-center">Enter your admin key to manage deals</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Admin key"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Unlock
          </Button>
        </form>
      </div>
    </div>
  )
}

function AdminPanel({ adminKey }: { adminKey: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)

  const { data, isLoading } = useListDeals({ limit: 100 })

  const adminRequest = { headers: { "x-admin-key": adminKey } }

  const createMutation = useCreateDeal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() })
        toast({ title: "Deal created", variant: "success" })
        setIsDialogOpen(false)
      },
      onError: (err: ApiError<unknown>) => {
        toast({ title: "Error", description: err.message, variant: "destructive" })
      },
    },
    request: adminRequest,
  })

  const updateMutation = useUpdateDeal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() })
        toast({ title: "Deal updated", variant: "success" })
        setIsDialogOpen(false)
      },
      onError: (err: ApiError<unknown>) => {
        toast({ title: "Error", description: err.message, variant: "destructive" })
      },
    },
    request: adminRequest,
  })

  const deleteMutation = useDeleteDeal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() })
        toast({ title: "Deal deleted" })
      },
      onError: (err: ApiError<unknown>) => {
        toast({ title: "Error", description: err.message, variant: "destructive" })
      },
    },
    request: adminRequest,
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: "", model: "", year: new Date().getFullYear(),
      carType: CreateDealRequestCarType.sedan,
      msrp: 0, monthlyPayment: 0, moneyDown: 0,
      termMonths: 36, mileageLimit: 10,
      region: "National", imageUrl: "", sourceUrl: "", trimLevel: "", description: "",
    },
  })

  const openCreate = () => {
    setEditingDeal(null)
    form.reset({
      make: "", model: "", year: new Date().getFullYear(),
      carType: CreateDealRequestCarType.sedan, msrp: 0, monthlyPayment: 0, moneyDown: 0,
      termMonths: 36, mileageLimit: 10, region: "National",
      imageUrl: "", sourceUrl: "", trimLevel: "", description: "",
    })
    setIsDialogOpen(true)
  }

  const openEdit = (deal: Deal) => {
    setEditingDeal(deal)
    form.reset({
      make: deal.make,
      model: deal.model,
      year: deal.year,
      carType: deal.carType as CreateDealRequestCarType,
      msrp: deal.msrp,
      monthlyPayment: deal.monthlyPayment,
      moneyDown: deal.moneyDown,
      termMonths: deal.termMonths,
      mileageLimit: deal.mileageLimit,
      region: deal.region,
      imageUrl: deal.imageUrl || "",
      sourceUrl: deal.sourceUrl || "",
      trimLevel: deal.trimLevel || "",
      description: deal.description || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this deal?")) {
      deleteMutation.mutate({ id })
    }
  }

  const onSubmit = (values: FormData) => {
    const payload = {
      ...values,
      carType: values.carType as CreateDealRequestCarType,
      imageUrl: values.imageUrl || null,
      sourceUrl: values.sourceUrl || null,
    }

    if (editingDeal) {
      updateMutation.mutate({ id: editingDeal.id, data: payload })
    } else {
      createMutation.mutate({ data: payload })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Manage Deals</h1>
            <p className="text-muted-foreground">Add, update, or remove lease deals.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add New Deal
          </Button>
        </div>

        <div className="bg-card rounded-2xl border shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary text-secondary-foreground uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4">MSRP</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : data?.deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-secondary/20">
                    <td className="px-6 py-4 font-medium">
                      {deal.year} {deal.make} {deal.model} {deal.trimLevel && `(${deal.trimLevel})`}
                    </td>
                    <td className="px-6 py-4">{formatCurrency(deal.msrp)}</td>
                    <td className="px-6 py-4 font-bold text-primary">{formatCurrency(deal.monthlyPayment)}/mo</td>
                    <td className="px-6 py-4">
                      <span className={deal.dealScore < 1.0 ? "text-green-400" : ""}>{deal.dealScore.toFixed(2)}%</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(deal)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(deal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDeal ? "Edit Deal" : "Add New Deal"}</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="make" render={({ field }) => (
                    <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="trimLevel" render={({ field }) => (
                    <FormItem><FormLabel>Trim (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="carType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {carTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
                  <FormField control={form.control} name="msrp" render={({ field }) => (
                    <FormItem><FormLabel>MSRP ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="monthlyPayment" render={({ field }) => (
                    <FormItem><FormLabel>Monthly Payment ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="moneyDown" render={({ field }) => (
                    <FormItem><FormLabel>Money Down ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="termMonths" render={({ field }) => (
                    <FormItem><FormLabel>Term (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mileageLimit" render={({ field }) => (
                    <FormItem><FormLabel>Mileage (k/yr)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="region" render={({ field }) => (
                    <FormItem><FormLabel>Region</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <FormField control={form.control} name="imageUrl" render={({ field }) => (
                    <FormItem><FormLabel>Image URL (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="sourceUrl" render={({ field }) => (
                    <FormItem><FormLabel>Source URL (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {editingDeal ? "Update Deal" : "Create Deal"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function Admin() {
  const [adminKey, setAdminKey] = useState<string | null>(null)

  if (!adminKey) {
    return <AdminLogin onUnlock={setAdminKey} />
  }

  return <AdminPanel adminKey={adminKey} />
}
