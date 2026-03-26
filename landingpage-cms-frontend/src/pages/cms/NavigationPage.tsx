import { useCMS, type NavigationLink } from "../../app/components/cms/CMSContext";
import {
  CMSAddButton,
  CMSInput,
  CMSListItem,
  CMSPageHeader,
  CMSSaveNotice,
  CMSSection,
} from "../../app/components/cms/CMSFormComponents";

type NavigationListKey =
  | "mainLinks"
  | "serviceLinks"
  | "footerMenuLinks"
  | "footerServiceLinks"
  | "legalLinks";

const createEmptyLink = (): NavigationLink => ({ label: "", href: "" });

export function NavigationPage() {
  const { data, updateData } = useCMS();
  const navigation = data.navigation;

  const updateNavigation = (next: typeof navigation) => {
    updateData("navigation", next);
  };

  const updateLinkList = (key: NavigationListKey, next: NavigationLink[]) => {
    updateNavigation({
      ...navigation,
      [key]: next,
    });
  };

  const updateLinkItem = (
    key: NavigationListKey,
    index: number,
    field: keyof NavigationLink,
    value: string,
  ) => {
    const next = [...navigation[key]];
    next[index] = { ...next[index], [field]: value };
    updateLinkList(key, next);
  };

  const renderListEditor = (key: NavigationListKey, title: string, description: string) => (
    <CMSSection title={title} description={description}>
      {navigation[key].map((item, index) => (
        <CMSListItem
          key={`${key}-${index}`}
          index={index}
          total={navigation[key].length}
          onDelete={() => updateLinkList(key, navigation[key].filter((_, current) => current !== index))}
          onMoveUp={() => {
            if (index === 0) return;
            const next = [...navigation[key]];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            updateLinkList(key, next);
          }}
          onMoveDown={() => {
            if (index === navigation[key].length - 1) return;
            const next = [...navigation[key]];
            [next[index + 1], next[index]] = [next[index], next[index + 1]];
            updateLinkList(key, next);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CMSInput
              label="Label"
              value={item.label}
              onChange={(value) => updateLinkItem(key, index, "label", value)}
              placeholder="Contoh: Beranda"
            />
            <CMSInput
              label="URL / Path"
              value={item.href}
              onChange={(value) => updateLinkItem(key, index, "href", value)}
              placeholder="/contact"
            />
          </div>
        </CMSListItem>
      ))}
      <CMSAddButton label={`Tambah ${title}`} onClick={() => updateLinkList(key, [...navigation[key], createEmptyLink()])} />
    </CMSSection>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <CMSPageHeader
        title="Navigation"
        subtitle="Kelola menu utama, dropdown layanan, footer, dan tautan legal di landing page."
        badge="LANDING NAVIGATION"
      >
        <CMSSaveNotice />
      </CMSPageHeader>

      <CMSSection title="Auth Links" description="Tautan login dan daftar yang dipakai di navbar serta mobile bottom nav.">
        <div className="grid gap-4 sm:grid-cols-2">
          <CMSInput
            label="Label Login"
            value={navigation.authLinks.login.label}
            onChange={(value) =>
              updateNavigation({
                ...navigation,
                authLinks: {
                  ...navigation.authLinks,
                  login: { ...navigation.authLinks.login, label: value },
                },
              })
            }
          />
          <CMSInput
            label="Path Login"
            value={navigation.authLinks.login.href}
            onChange={(value) =>
              updateNavigation({
                ...navigation,
                authLinks: {
                  ...navigation.authLinks,
                  login: { ...navigation.authLinks.login, href: value },
                },
              })
            }
          />
          <CMSInput
            label="Label Daftar"
            value={navigation.authLinks.register.label}
            onChange={(value) =>
              updateNavigation({
                ...navigation,
                authLinks: {
                  ...navigation.authLinks,
                  register: { ...navigation.authLinks.register, label: value },
                },
              })
            }
          />
          <CMSInput
            label="Path Daftar"
            value={navigation.authLinks.register.href}
            onChange={(value) =>
              updateNavigation({
                ...navigation,
                authLinks: {
                  ...navigation.authLinks,
                  register: { ...navigation.authLinks.register, href: value },
                },
              })
            }
          />
        </div>
      </CMSSection>

      {renderListEditor("mainLinks", "Main Links", "Menu utama website di navbar dan mobile navigation.")}
      {renderListEditor("serviceLinks", "Service Links", "Dropdown layanan pada navbar desktop.")}
      {renderListEditor("footerMenuLinks", "Footer Menu Links", "Daftar menu utama pada footer.")}
      {renderListEditor("footerServiceLinks", "Footer Service Links", "Daftar layanan pada footer.")}
      {renderListEditor("legalLinks", "Legal Links", "Tautan legal di footer bawah seperti privacy policy dan contact.")}
    </div>
  );
}
