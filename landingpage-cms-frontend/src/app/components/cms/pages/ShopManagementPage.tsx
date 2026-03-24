import { useState } from "react";
import { useCMS, type ProductItem, type ShopCategory, type DiscountCode } from "../CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput, CMSNumberInput, CMSToggle, CMSSelect, CMSListItem, CMSAddButton, CMSSaveNotice } from "../CMSFormComponents";
import { Badge } from "../../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { ShoppingBag, Tag, Percent } from "lucide-react";

export function ShopManagementPage() {
  const { data, updateData } = useCMS();

  // ─── Products ───
  const updateProduct = (i: number, key: keyof ProductItem, value: any) => {
    const arr = [...data.products];
    arr[i] = { ...arr[i], [key]: value };
    updateData("products", arr);
  };

  const addProduct = () => {
    updateData("products", [...data.products, {
      id: `p${Date.now()}`, name: "", price: 0, category: data.shopCategories[0]?.name || "Merchandise",
      image: "", badge: "", desc: "", rating: 0, reviews: 0, stock: 0, enabled: true,
    }]);
  };

  // ─── Categories ───
  const updateCategory = (i: number, key: keyof ShopCategory, value: string) => {
    const arr = [...data.shopCategories];
    arr[i] = { ...arr[i], [key]: value };
    updateData("shopCategories", arr);
  };

  // ─── Discounts ───
  const updateDiscount = (i: number, key: keyof DiscountCode, value: any) => {
    const arr = [...data.discountCodes];
    arr[i] = { ...arr[i], [key]: value };
    updateData("discountCodes", arr);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <CMSPageHeader title="Shop Management" subtitle="Kelola produk, kategori, dan diskon" badge="SHOP">
        <CMSSaveNotice />
      </CMSPageHeader>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-500">
          <ShoppingBag className="mr-1 h-3 w-3" /> {data.products.length} Produk
        </Badge>
        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-400">
          <Tag className="mr-1 h-3 w-3" /> {data.shopCategories.length} Kategori
        </Badge>
        <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-[10px] text-green-400">
          <Percent className="mr-1 h-3 w-3" /> {data.discountCodes.filter(d => d.active).length} Diskon Aktif
        </Badge>
      </div>

      <Tabs defaultValue="products">
        <TabsList className="bg-[#18181b] border border-white/10">
          <TabsTrigger value="products" className="text-xs data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-500">Produk</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-500">Kategori</TabsTrigger>
          <TabsTrigger value="discounts" className="text-xs data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-500">Diskon</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 space-y-4">
          {data.products.map((p, i) => (
            <CMSSection key={p.id} title={p.name || "Produk Baru"} collapsible>
              <CMSListItem onDelete={() => updateData("products", data.products.filter((_, j) => j !== i))}>
                <CMSInput label="Nama Produk" value={p.name} onChange={(v) => updateProduct(i, "name", v)} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <CMSNumberInput label="Harga (Rp)" value={p.price} onChange={(v) => updateProduct(i, "price", v)} />
                  <CMSNumberInput label="Stok" value={p.stock} onChange={(v) => updateProduct(i, "stock", v)} />
                  <CMSInput label="Badge" value={p.badge} onChange={(v) => updateProduct(i, "badge", v)} />
                </div>
                <CMSSelect label="Kategori" value={p.category} onChange={(v) => updateProduct(i, "category", v)}
                  options={data.shopCategories.map(c => ({ label: c.name, value: c.name }))} />
                <CMSTextarea label="Deskripsi" value={p.desc} onChange={(v) => updateProduct(i, "desc", v)} rows={2} />
                <CMSImageInput label="Gambar" value={p.image} onChange={(v) => updateProduct(i, "image", v)} />
                <CMSToggle label="Aktif" checked={p.enabled} onChange={(v) => updateProduct(i, "enabled", v)} />
              </CMSListItem>
            </CMSSection>
          ))}
          <CMSAddButton label="Tambah Produk" onClick={addProduct} />
        </TabsContent>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <CMSSection title="Kategori Produk">
            {data.shopCategories.map((c, i) => (
              <CMSListItem key={c.id} onDelete={() => updateData("shopCategories", data.shopCategories.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Nama Kategori" value={c.name} onChange={(v) => updateCategory(i, "name", v)} />
                  <CMSInput label="Slug" value={c.slug} onChange={(v) => updateCategory(i, "slug", v)} />
                </div>
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Kategori" onClick={() => updateData("shopCategories", [...data.shopCategories, { id: `sc${Date.now()}`, name: "", slug: "" }])} />
          </CMSSection>
        </TabsContent>

        <TabsContent value="discounts" className="mt-4 space-y-4">
          <CMSSection title="Kode Diskon">
            {data.discountCodes.map((d, i) => (
              <CMSListItem key={d.id} onDelete={() => updateData("discountCodes", data.discountCodes.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Kode" value={d.code} onChange={(v) => updateDiscount(i, "code", v)} />
                  <CMSSelect label="Tipe" value={d.type} onChange={(v) => updateDiscount(i, "type", v as any)}
                    options={[{ label: "Persentase (%)", value: "percent" }, { label: "Nominal (Rp)", value: "fixed" }]} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <CMSNumberInput label="Nilai" value={d.value} onChange={(v) => updateDiscount(i, "value", v)} />
                  <CMSNumberInput label="Min. Pembelian (Rp)" value={d.minPurchase} onChange={(v) => updateDiscount(i, "minPurchase", v)} />
                  <CMSInput label="Berlaku Sampai" value={d.expiresAt} onChange={(v) => updateDiscount(i, "expiresAt", v)} type="date" />
                </div>
                <CMSToggle label="Aktif" checked={d.active} onChange={(v) => updateDiscount(i, "active", v)} />
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Kode Diskon" onClick={() => updateData("discountCodes", [...data.discountCodes, { id: `dc${Date.now()}`, code: "", type: "percent", value: 0, minPurchase: 0, active: true, expiresAt: "" }])} />
          </CMSSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
