import type { Metadata } from "next"
import { Logo } from "@/components/logo"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { formatEuro } from "@/lib/utils/pricing"
import {
  findClaimableLead,
  parseLeadPhotoPaths,
  signedLeadPhotoUrls,
} from "@/lib/dj-leads"
import { ClaimForm } from "./claim-form"
import { deleteMyData } from "./actions"
import { dict } from "./i18n"

export const dynamic = "force-dynamic"

// Persoonlijke link: niet in zoekmachines en niet doorgeven aan andere sites.
export const metadata: Metadata = {
  title: "Claim je profiel · MyGigs",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { locale } = await getI18n()
  const d = dict[locale]

  const lead = await findClaimableLead(token)

  if (!lead || !lead.stage_name) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <h1 className="text-xl font-semibold">{d.invalidTitle}</h1>
          <p className="mt-2 text-sm text-muted">{d.invalidBody}</p>
        </div>
      </Shell>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const paths = parseLeadPhotoPaths(lead.photo_paths, lead.id)
  const urls = await signedLeadPhotoUrls(paths)
  const photo = urls["512"] ?? urls["1200"] ?? urls["160"] ?? null
  const blur = lead.photo_blur ?? undefined

  const links = [
    lead.instagram_handle && {
      label: `@${lead.instagram_handle}`,
      href: `https://www.instagram.com/${lead.instagram_handle}/`,
    },
    lead.soundcloud_url && { label: "SoundCloud", href: lead.soundcloud_url },
    lead.mixcloud_url && { label: "Mixcloud", href: lead.mixcloud_url },
    lead.spotify_url && { label: "Spotify", href: lead.spotify_url },
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <Shell>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{d.heading}</h1>
        <p className="mt-2 text-sm text-muted">{d.intro}</p>
      </div>

      {/* Voorbeeld van het profiel */}
      <article className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative aspect-square w-full bg-surface-2">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={lead.stage_name}
              className="h-full w-full object-cover"
              style={blur ? { backgroundImage: `url(${blur})`, backgroundSize: "cover" } : undefined}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted">
              {d.noPhoto}
            </div>
          )}
        </div>
        <div className="p-5">
          <h2 className="text-2xl font-semibold">{lead.stage_name}</h2>
          {(lead.home_city || lead.base_gage) && (
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm text-muted">
              {lead.home_city && <span>{lead.home_city}</span>}
              {lead.base_gage ? (
                <span className="font-semibold text-brand">
                  {formatEuro(Number(lead.base_gage))}{" "}
                  <span className="font-normal text-muted">{d.perNight}</span>
                </span>
              ) : null}
            </p>
          )}
          {lead.genres.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {lead.genres.map((g) => (
                <li key={g} className="rounded-full border border-border px-2.5 py-1 text-xs">
                  {g}
                </li>
              ))}
            </ul>
          )}
          {lead.bio && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {lead.bio}
            </p>
          )}
          {links.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium text-muted">{d.links}</p>
              <ul className="flex flex-wrap gap-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border px-3 py-1 text-xs transition hover:border-brand/50"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>

      <div className="mt-6">
        <ClaimForm
          token={token}
          leadEmail={lead.email}
          viewerEmail={user?.email ?? null}
          hasPhoto={!!photo}
          d={d}
        />
      </div>

      {/* Niet op MyGigs willen staan: altijd mogelijk, zonder account. */}
      <details className="mt-6 rounded-2xl border border-border bg-surface p-5 text-sm">
        <summary className="cursor-pointer font-medium text-muted">{d.deleteTitle}</summary>
        <p className="mt-3 text-muted">{d.deleteBody}</p>
        <form action={deleteMyData} className="mt-4">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="rounded-full border border-red-500/50 px-5 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
          >
            {d.deleteBtn}
          </button>
        </form>
      </details>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <div className="safe-py relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-8 text-center">
          <Logo />
        </div>
        {children}
      </div>
    </main>
  )
}
