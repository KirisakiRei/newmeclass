import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Button } from "../../app/components/ui/button";
import { Badge } from "../../app/components/ui/badge";
import { Card, CardContent } from "../../app/components/ui/card";
import { ImageWithFallback } from "../../app/components/media/ImageWithFallback";
import { useCMS } from "../../app/components/cms/CMSContext";
import {
  ArrowRight,
  Package2,
  Search,
  ShoppingBag,
  Star,
  Tag,
} from "lucide-react";
import { Link } from "react-router";

type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  badge: string;
  desc: string;
  rating: number;
  reviews: number;
  stock: number;
  enabled: boolean;
};

const formatPrice = (value: number) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

export function ShopPage() {
  const { data } = useCMS();
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  const products = useMemo<CatalogProduct[]>(
    () =>
      (data.products || [])
        .filter((item) => item.enabled !== false)
        .map((item, index) => ({
          id: String(item.id || `product-${index + 1}`),
          name: item.name || "Produk NEWME",
          price: Number(item.price || 0),
          category: item.category || "Produk",
          image: item.image || "",
          badge: item.badge || "",
          desc: item.desc || "",
          rating: Number(item.rating || 0),
          reviews: Number(item.reviews || 0),
          stock: Number(item.stock || 0),
          enabled: item.enabled !== false,
        })),
    [data.products],
  );

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((item) => item.category).filter(Boolean)))],
    [products],
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((item) => {
        const matchesCategory = category === "Semua" || item.category === category;
        const matchesSearch = `${item.name} ${item.desc}`.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [category, products, search],
  );

  const featuredProduct =
    filteredProducts.find((item) => item.id === selectedProductId)
    || filteredProducts[0]
    || null;

  return (
    <div className="bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-4 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">NEWME SHOP</Badge>
            <h1 className="text-3xl text-white sm:text-5xl" style={{ fontWeight: 800 }}>
              Katalog Produk & Merch
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-zinc-400 sm:text-base" style={{ lineHeight: 1.8 }}>
              Jelajahi produk pilihan NEWME yang dapat melengkapi pengalaman belajar, asesmen, dan pengembangan diri Anda.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                    item === category
                      ? "bg-yellow-500 text-black"
                      : "border border-white/10 bg-[#18181b] text-zinc-400 hover:text-yellow-500"
                  }`}
                  style={{ fontWeight: item === category ? 600 : 400 }}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#18181b] px-3 py-2">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari produk..."
                className="bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 outline-none"
              />
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
              <Package2 className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
              <h2 className="mb-2 text-xl text-white" style={{ fontWeight: 700 }}>
                Produk Belum Tersedia
              </h2>
              <p className="mx-auto max-w-xl text-sm text-zinc-500" style={{ lineHeight: 1.7 }}>
                Konten katalog masih disiapkan di CMS. Silakan kembali lagi atau hubungi tim NEWME untuk informasi produk terbaru.
              </p>
            </div>
          ) : (
            <>
              {featuredProduct && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-10 overflow-hidden rounded-3xl border border-white/10 bg-[#18181b]"
                >
                  <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="overflow-hidden">
                      <ImageWithFallback
                        src={featuredProduct.image}
                        alt={featuredProduct.name}
                        className="h-full min-h-[260px] w-full object-cover"
                      />
                    </div>
                    <div className="p-6 sm:p-8">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                          {featuredProduct.category}
                        </Badge>
                        {featuredProduct.badge && (
                          <Badge variant="outline" className="border-white/10 text-zinc-300">
                            {featuredProduct.badge}
                          </Badge>
                        )}
                      </div>
                      <h2 className="mb-3 text-2xl text-white sm:text-3xl" style={{ fontWeight: 800 }}>
                        {featuredProduct.name}
                      </h2>
                      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                        {featuredProduct.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            {featuredProduct.rating.toFixed(1)}
                          </span>
                        )}
                        {featuredProduct.reviews > 0 && <span>{featuredProduct.reviews} review</span>}
                        <span className={featuredProduct.stock > 0 ? "text-emerald-400" : "text-zinc-500"}>
                          {featuredProduct.stock > 0 ? `Stok tersedia: ${featuredProduct.stock}` : "Ketersediaan menyesuaikan"}
                        </span>
                      </div>
                      <p className="mb-6 text-sm text-zinc-400 sm:text-base" style={{ lineHeight: 1.8 }}>
                        {featuredProduct.desc || "Deskripsi produk akan tampil di sini setelah diperbarui melalui CMS landing."}
                      </p>
                      <div className="mb-8 text-3xl text-yellow-500" style={{ fontWeight: 800 }}>
                        {formatPrice(featuredProduct.price)}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button className="bg-yellow-500 text-black hover:bg-yellow-400" asChild>
                          <Link to="/contact">
                            Hubungi Tim NEWME
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white" asChild>
                          <Link to="/services">Lihat Program NEWME</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                {filteredProducts.map((product, index) => (
                  <motion.button
                    key={product.id}
                    type="button"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => setSelectedProductId(product.id)}
                    className="text-left"
                  >
                    <Card className={`group h-full overflow-hidden border transition-colors ${
                      featuredProduct?.id === product.id
                        ? "border-yellow-500/30 bg-[#18181b]"
                        : "border-white/10 bg-[#18181b] hover:border-yellow-500/20"
                    }`}>
                      <div className="relative h-36 overflow-hidden sm:h-56">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] to-transparent" />
                        {product.badge && (
                          <Badge className="absolute right-3 top-3 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                            {product.badge}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4 sm:p-5">
                        <div className="mb-2 flex items-center gap-2 text-[11px] text-zinc-500 sm:text-xs">
                          <Tag className="h-3 w-3 text-yellow-500" />
                          {product.category}
                        </div>
                        <h3 className="mb-2 text-sm text-white sm:text-base" style={{ fontWeight: 700, lineHeight: 1.35 }}>
                          {product.name}
                        </h3>
                        <p className="mb-4 line-clamp-2 text-xs text-zinc-500 sm:text-sm" style={{ lineHeight: 1.7 }}>
                          {product.desc || "Detail produk akan segera diperbarui."}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-yellow-500 sm:text-lg" style={{ fontWeight: 700 }}>
                            {formatPrice(product.price)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 sm:text-xs">
                            <ShoppingBag className="h-3 w-3 text-yellow-500" />
                            Detail
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
