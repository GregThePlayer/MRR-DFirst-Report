"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCurrency } from "@/lib/currency-context"
import { useProducts } from "@/lib/use-data"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Package, Plus, Link2, ArrowRight, Tag, Loader2, Trash2 } from "lucide-react"

export default function ProductsPage() {
  const { formatCurrency } = useCurrency()
  const { data: DEMO_PRODUCTS, refetch } = useProducts()
  const [aliasDialogOpen, setAliasDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<typeof DEMO_PRODUCTS[0] | null>(null)
  const [newAlias, setNewAlias] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [productForm, setProductForm] = useState({
    name: '', display_name: '', category: 'subscription' as string,
    billing_type: 'monthly' as string, base_price_usd: '', description: ''
  })

  const handleAddProduct = async () => {
    if (!supabase || !productForm.name) return
    setSaving(true)
    try {
      const { error } = await (supabase as any).from('products').insert({
        name: productForm.name,
        display_name: productForm.display_name || productForm.name,
        category: productForm.category,
        billing_type: productForm.billing_type,
        base_price_usd: productForm.base_price_usd ? parseFloat(productForm.base_price_usd) : null,
        description: productForm.description || null,
        is_active: true,
      })
      if (error) throw error
      toast.success('Product added')
      setAddDialogOpen(false)
      setProductForm({ name: '', display_name: '', category: 'subscription', billing_type: 'monthly', base_price_usd: '', description: '' })
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  const handleEditProduct = async () => {
    if (!supabase || !selectedProduct) return
    setSaving(true)
    try {
      const { error } = await (supabase as any).from('products').update({
        name: productForm.name,
        display_name: productForm.display_name || productForm.name,
        category: productForm.category,
        billing_type: productForm.billing_type,
        base_price_usd: productForm.base_price_usd ? parseFloat(productForm.base_price_usd) : null,
        description: productForm.description || null,
      }).eq('id', selectedProduct.id)
      if (error) throw error
      toast.success('Product updated')
      setEditDialogOpen(false)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!supabase) return
    if (!confirm('Delete this product?')) return
    try {
      const { error } = await (supabase as any).from('products').delete().eq('id', productId)
      if (error) throw error
      toast.success('Product deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const categoryColors: Record<string, string> = {
    subscription: "bg-blue-100 text-blue-700",
    course: "bg-purple-100 text-purple-700",
    enterprise: "bg-amber-100 text-amber-700",
    one_time: "bg-gray-100 text-gray-700",
    other: "bg-gray-100 text-gray-700",
  }

  const billingColors: Record<string, string> = {
    monthly: "bg-emerald-100 text-emerald-700",
    annual: "bg-[#D9FD13]/30 text-black",
    one_time: "bg-gray-100 text-gray-600",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Product catalog with alias grouping · {DEMO_PRODUCTS.length} products
          </p>
        </div>
        <Button className="bg-black text-white hover:bg-gray-800" onClick={() => {
          setProductForm({ name: '', display_name: '', category: 'subscription', billing_type: 'monthly', base_price_usd: '', description: '' })
          setAddDialogOpen(true)
        }}>
          <Plus className="w-4 h-4 mr-1" /> Add Product
        </Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-[#D9FD13]/10 border-[#D9FD13]/30 shadow-none">
        <div className="flex items-start gap-3">
          <Link2 className="w-5 h-5 text-black mt-0.5" />
          <div>
            <p className="text-sm font-medium text-black">Product Alias Grouping</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Different data sources use different names for the same product. Use aliases to group them into one canonical product.
              For example: &quot;STARTER [1M]&quot; from Stripe and &quot;Starter Monthly&quot; from invoices → both map to &quot;Starter Monthly&quot;.
            </p>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              <TableHead className="font-bold text-black">Product</TableHead>
              <TableHead className="font-bold text-black">Category</TableHead>
              <TableHead className="font-bold text-black">Billing</TableHead>
              <TableHead className="font-bold text-black text-right">Price</TableHead>
              <TableHead className="font-bold text-black text-right">Customers</TableHead>
              <TableHead className="font-bold text-black text-right">Revenue</TableHead>
              <TableHead className="font-bold text-black">Aliases</TableHead>
              <TableHead className="font-bold text-black w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_PRODUCTS.map(p => (
              <TableRow key={p.id} className="hover:bg-gray-50/80 cursor-pointer" onClick={() => {
                setSelectedProduct(p)
                setProductForm({
                  name: p.name, display_name: p.name, category: p.category, billing_type: p.billing_type,
                  base_price_usd: p.base_price_usd ? String(p.base_price_usd) : '', description: ''
                })
                setEditDialogOpen(true)
              }}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="font-medium text-sm">{p.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${categoryColors[p.category] || categoryColors.other} hover:${categoryColors[p.category] || categoryColors.other} text-[10px]`}>
                    {p.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`${billingColors[p.billing_type] || billingColors.one_time} hover:${billingColors[p.billing_type] || billingColors.one_time} text-[10px]`}>
                    {p.billing_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-right">
                  {p.base_price_usd ? formatCurrency(p.base_price_usd) + '/mo' : '—'}
                </TableCell>
                <TableCell className="text-sm text-right font-semibold">{p.customers}</TableCell>
                <TableCell className="text-sm text-right font-semibold">{formatCurrency(p.revenue)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {p.aliases.slice(0, 2).map(a => (
                      <Badge key={a} variant="outline" className="text-[9px] font-mono">{a}</Badge>
                    ))}
                    {p.aliases.length > 2 && (
                      <Badge variant="outline" className="text-[9px]">+{p.aliases.length - 2}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); setAliasDialogOpen(true) }}
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Revenue by Product */}
      <Card className="p-5 bg-white border border-gray-100 shadow-none">
        <h3 className="font-semibold text-sm text-black mb-4">Revenue Distribution</h3>
        <div className="space-y-3">
          {DEMO_PRODUCTS.sort((a, b) => b.revenue - a.revenue).map(p => {
            const maxRev = DEMO_PRODUCTS.length > 0 ? Math.max(...DEMO_PRODUCTS.map(p => p.revenue)) : 1
            const pct = maxRev > 0 ? p.revenue / maxRev : 0
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-40 truncate">{p.name}</span>
                <div className="flex-1 h-6 bg-gray-50 rounded overflow-hidden">
                  <div
                    className="h-full bg-black rounded flex items-center pl-2"
                    style={{ width: `${pct * 100}%` }}
                  >
                    {pct > 0.15 && <span className="text-[10px] text-white font-medium">{formatCurrency(p.revenue)}</span>}
                  </div>
                </div>
                {pct <= 0.15 && <span className="text-xs text-gray-500">{formatCurrency(p.revenue)}</span>}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Alias Management Dialog */}
      <Dialog open={aliasDialogOpen} onOpenChange={setAliasDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Manage Aliases — {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-gray-500">
              These raw names from data sources all map to this canonical product.
              When data is imported, any transaction with one of these names will be assigned to this product.
            </p>

            <div className="space-y-2">
              {selectedProduct?.aliases.map(a => (
                <div key={a} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Badge variant="outline" className="text-xs font-mono flex-1">{a}</Badge>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{selectedProduct.name}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add new alias (e.g. 'Starter Plan')"
                value={newAlias}
                onChange={e => setNewAlias(e.target.value)}
                className="text-sm"
              />
              <Button className="bg-black text-white hover:bg-gray-800 shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={addDialogOpen || editDialogOpen} onOpenChange={(open) => { if (!open) { setAddDialogOpen(false); setEditDialogOpen(false) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editDialogOpen ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Product Name (internal)</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({...f, name: e.target.value}))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Display Name</Label><Input value={productForm.display_name} onChange={e => setProductForm(f => ({...f, display_name: e.target.value}))} className="h-8 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <select className="w-full h-8 text-sm border rounded px-2" value={productForm.category} onChange={e => setProductForm(f => ({...f, category: e.target.value}))}>
                  <option value="subscription">Subscription</option>
                  <option value="course">Course</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="one_time">One-time</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Billing Type</Label>
                <select className="w-full h-8 text-sm border rounded px-2" value={productForm.billing_type} onChange={e => setProductForm(f => ({...f, billing_type: e.target.value}))}>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
            </div>
            <div><Label className="text-xs">Base Price (USD)</Label><Input value={productForm.base_price_usd} onChange={e => setProductForm(f => ({...f, base_price_usd: e.target.value}))} className="h-8 text-sm" type="number" step="0.01" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setAddDialogOpen(false); setEditDialogOpen(false) }}>Cancel</Button>
              <Button size="sm" className="bg-black text-white hover:bg-gray-800" onClick={editDialogOpen ? handleEditProduct : handleAddProduct} disabled={saving || !productForm.name}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                {editDialogOpen ? 'Save' : 'Add Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
