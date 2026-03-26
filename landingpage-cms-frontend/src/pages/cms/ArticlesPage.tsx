import { useCMS, type ArticleItem } from "../../app/components/cms/CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput, CMSToggle, CMSListItem, CMSAddButton, CMSSaveNotice } from "../../app/components/cms/CMSFormComponents";
import { Badge } from "../../app/components/ui/badge";

export function CMSArticlesPage() {
  const { data, updateData } = useCMS();
  const items = data.articles;

  const update = (i: number, key: keyof ArticleItem, value: any) => {
    const arr = [...items];
    arr[i] = { ...arr[i], [key]: value };
    updateData("articles", arr);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Articles Section" subtitle="Kelola artikel yang tampil di landing page dan halaman artikel" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      <div className="flex gap-2">
        <Badge variant="outline" className="border-green-500/30 text-[10px] text-green-500">
          {items.filter(a => a.published).length} Published
        </Badge>
        <Badge variant="outline" className="border-zinc-500/30 text-[10px] text-zinc-500">
          {items.filter(a => !a.published).length} Draft
        </Badge>
      </div>

      {items.map((a, i) => (
        <CMSSection key={a.id} title={a.title || `Artikel ${i + 1}`} collapsible>
          <CMSListItem onDelete={() => updateData("articles", items.filter((_, j) => j !== i))}>
            <CMSInput label="Judul" value={a.title} onChange={(v) => update(i, "title", v)} />
            <CMSTextarea label="Excerpt" value={a.excerpt} onChange={(v) => update(i, "excerpt", v)} rows={2} />
            <CMSTextarea label="Isi Artikel" value={a.content} onChange={(v) => update(i, "content", v)} rows={8} />
            <CMSImageInput label="Gambar" value={a.image} onChange={(v) => update(i, "image", v)} />
            <div className="grid gap-3 sm:grid-cols-4">
              <CMSInput label="Author" value={a.author} onChange={(v) => update(i, "author", v)} />
              <CMSInput label="Tanggal" value={a.date} onChange={(v) => update(i, "date", v)} type="date" />
              <CMSInput label="Kategori" value={a.category} onChange={(v) => update(i, "category", v)} />
              <CMSInput label="Estimasi Baca" value={a.readTime} onChange={(v) => update(i, "readTime", v)} placeholder="5 menit" />
            </div>
            <CMSToggle label="Published" description="Artikel yang dipublish akan tampil di website" checked={a.published} onChange={(v) => update(i, "published", v)} />
          </CMSListItem>
        </CMSSection>
      ))}

      <CMSAddButton
        label="Tambah Artikel"
        onClick={() =>
          updateData("articles", [
            ...items,
            {
              id: `ar${Date.now()}`,
              title: "",
              excerpt: "",
              content: "",
              image: "",
              author: "Admin NEWME",
              date: new Date().toISOString().split("T")[0],
              category: "Tips",
              readTime: "5 menit",
              published: false,
            },
          ])
        }
      />
    </div>
  );
}
