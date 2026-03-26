import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { useMemo, useState } from "react";
import { Badge } from "../../app/components/ui/badge";
import { Button } from "../../app/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Search,
  Tag,
} from "lucide-react";
import { ImageWithFallback } from "../../app/components/media/ImageWithFallback";
import { useCMS } from "../../app/components/cms/CMSContext";

const formatArticleDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const splitArticleContent = (content: string, fallback: string) => {
  const source = (content || fallback || "").trim();
  if (!source) return [];
  return source
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export function ArticlesPage() {
  const { data } = useCMS();
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [search, setSearch] = useState("");

  const publishedArticles = useMemo(
    () => data.articles.filter((article) => article.published),
    [data.articles],
  );

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(publishedArticles.map((article) => article.category).filter(Boolean)))],
    [publishedArticles],
  );

  const filtered = useMemo(
    () =>
      publishedArticles.filter((article) => {
        const matchCategory =
          activeCategory === "Semua" || article.category === activeCategory;
        const matchSearch =
          search.trim() === "" ||
          article.title.toLowerCase().includes(search.toLowerCase()) ||
          article.excerpt.toLowerCase().includes(search.toLowerCase()) ||
          article.content.toLowerCase().includes(search.toLowerCase());
        return matchCategory && matchSearch;
      }),
    [activeCategory, publishedArticles, search],
  );

  const [featured, ...rest] = filtered;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 pt-24">
      <div className="relative overflow-hidden border-b border-white/[0.06] pb-16 pt-12">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(234,179,8,1) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/8 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="mb-3 text-sm tracking-[0.2em] text-yellow-500"
              style={{ fontWeight: 500 }}
            >
              INSIGHT & WAWASAN
            </p>
            <h1
              className="mb-4 text-4xl text-white sm:text-5xl"
              style={{ fontWeight: 800 }}
            >
              Artikel Terbaru
            </h1>
            <p
              className="mx-auto max-w-xl text-zinc-400"
              style={{ lineHeight: 1.7 }}
            >
              Temukan insight terkini seputar psikologi, pengembangan diri,
              parenting, dan karir dari NEWME.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-1.5 text-sm transition-all ${
                  activeCategory === category
                    ? "bg-yellow-500 text-black"
                    : "border border-white/10 text-zinc-400 hover:border-yellow-500/30 hover:text-zinc-200"
                }`}
                style={{ fontWeight: activeCategory === category ? 600 : 400 }}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari artikel..."
              className="h-9 rounded-full border border-white/10 bg-white/[0.03] pl-9 pr-4 text-sm text-zinc-300 outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/40"
              style={{ width: 220 }}
            />
          </div>
        </motion.div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-zinc-700" />
            <p className="text-zinc-500">Tidak ada artikel yang ditemukan.</p>
          </div>
        ) : (
          <>
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-10"
              >
                <Link
                  to={`/articles/${featured.id}`}
                  className="group grid overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20 lg:grid-cols-2"
                >
                  <div className="relative h-64 overflow-hidden lg:h-auto">
                    <ImageWithFallback
                      src={featured.image}
                      alt={featured.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent to-[#18181b]/40 lg:block" />
                  </div>
                  <div className="flex flex-col justify-center p-8 lg:p-12">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                        {featured.category}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar className="h-3 w-3" />
                        {formatArticleDate(featured.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="h-3 w-3" />
                        {featured.readTime}
                      </span>
                    </div>
                    <h2
                      className="mb-4 text-2xl text-white transition-colors group-hover:text-yellow-400 sm:text-3xl"
                      style={{ fontWeight: 700, lineHeight: 1.35 }}
                    >
                      {featured.title}
                    </h2>
                    <p
                      className="mb-6 text-zinc-400"
                      style={{ lineHeight: 1.7 }}
                    >
                      {featured.excerpt}
                    </p>
                    <span
                      className="flex items-center gap-2 text-sm text-yellow-500"
                      style={{ fontWeight: 500 }}
                    >
                      Baca Selengkapnya
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            )}

            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.08 }}
                  >
                    <Link
                      to={`/articles/${article.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <ImageWithFallback
                          src={article.image}
                          alt={article.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <div className="mb-3 flex items-center gap-2">
                          <Badge className="border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-500">
                            {article.category}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="h-3 w-3" />
                            {article.readTime}
                          </span>
                        </div>
                        <h3
                          className="mb-3 flex-1 text-white transition-colors group-hover:text-yellow-400"
                          style={{ fontWeight: 600, lineHeight: 1.5 }}
                        >
                          {article.title}
                        </h3>
                        <p
                          className="mb-4 line-clamp-2 text-sm text-zinc-500"
                          style={{ lineHeight: 1.65 }}
                        >
                          {article.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatArticleDate(article.date)}
                          </span>
                          <span
                            className="flex items-center gap-1 text-yellow-500 opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ fontWeight: 500 }}
                          >
                            Baca
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const { data } = useCMS();

  const publishedArticles = useMemo(
    () => data.articles.filter((article) => article.published),
    [data.articles],
  );
  const article = publishedArticles.find((item) => item.id === id);
  const related = publishedArticles.filter((item) => item.id !== id).slice(0, 3);
  const contentBlocks = splitArticleContent(article?.content || "", article?.excerpt || "");

  if (!article) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] pt-20">
        <div className="text-center">
          <p className="mb-4 text-zinc-500">Artikel tidak ditemukan.</p>
          <Button
            asChild
            variant="outline"
            className="border-white/20 text-zinc-300 hover:bg-white/5"
          >
            <Link to="/articles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Artikel
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-20">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative h-72 w-full overflow-hidden sm:h-96 lg:h-[480px]"
      >
        <ImageWithFallback
          src={article.image}
          alt={article.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        <div className="absolute left-6 top-6 z-10 sm:left-10">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/20 bg-black/40 text-zinc-300 backdrop-blur-sm hover:bg-white/10"
          >
            <Link to="/articles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Semua Artikel
            </Link>
          </Button>
        </div>
      </motion.div>

      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 -mt-16 mb-8"
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
              <Tag className="mr-1 h-3 w-3" />
              {article.category}
            </Badge>
            <span className="flex items-center gap-1 text-sm text-zinc-500">
              <Calendar className="h-3.5 w-3.5" />
              {formatArticleDate(article.date)}
            </span>
            <span className="flex items-center gap-1 text-sm text-zinc-500">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime}
            </span>
          </div>

          <h1
            className="text-3xl text-white sm:text-4xl"
            style={{ fontWeight: 800, lineHeight: 1.25 }}
          >
            {article.title}
          </h1>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <div className="h-1 w-1 rounded-full bg-yellow-500/60" />
            <div className="h-px w-12 bg-yellow-500/30" />
          </div>

          <p
            className="mt-6 text-lg text-zinc-300"
            style={{ lineHeight: 1.8, fontWeight: 300 }}
          >
            {article.excerpt}
          </p>
          <p className="mt-4 text-sm text-zinc-500">Ditulis oleh {article.author}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-6"
        >
          {contentBlocks.map((block, index) => (
            <p key={`${article.id}-${index}`} className="text-zinc-400" style={{ lineHeight: 1.9 }}>
              {block}
            </p>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-8 text-center"
        >
          <p
            className="mb-2 text-sm tracking-[0.15em] text-yellow-500"
            style={{ fontWeight: 500 }}
          >
            NEWME CLASS
          </p>
          <h3 className="mb-3 text-xl text-white" style={{ fontWeight: 700 }}>
            Siap Menggali Potensi Terbaik Anda?
          </h3>
          <p
            className="mb-6 text-sm text-zinc-400"
            style={{ lineHeight: 1.7 }}
          >
            Mulai perjalanan pengembangan diri Anda bersama layanan dan asesmen
            NEWME.
          </p>
          <Button
            asChild
            className="bg-yellow-500 text-black hover:bg-yellow-400"
            style={{ fontWeight: 600 }}
          >
            <Link to="/services/personality-tests">Mulai Asesmen</Link>
          </Button>
        </motion.div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto mt-20 max-w-7xl px-6">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>
              Artikel Terkait
            </h2>
            <Link
              to="/articles"
              className="flex items-center gap-1 text-sm text-yellow-500 hover:text-yellow-400"
              style={{ fontWeight: 500 }}
            >
              Lihat Semua
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((relatedArticle, index) => (
              <motion.div
                key={relatedArticle.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <Link
                  to={`/articles/${relatedArticle.id}`}
                  className="group flex gap-4 overflow-hidden rounded-xl border border-white/10 bg-[#18181b] p-4 transition-colors hover:border-yellow-500/20"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                    <ImageWithFallback
                      src={relatedArticle.image}
                      alt={relatedArticle.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <Badge className="mb-1.5 w-fit border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-500">
                      {relatedArticle.category}
                    </Badge>
                    <p
                      className="line-clamp-2 text-sm text-zinc-300 transition-colors group-hover:text-white"
                      style={{ fontWeight: 500, lineHeight: 1.5 }}
                    >
                      {relatedArticle.title}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
