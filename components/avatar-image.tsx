import { avatarSource, initialsOf, type AvatarWidth } from "@/lib/utils/avatar"

// Toont een profielfoto met de juiste variant per scherm, een vervaagde
// placeholder tijdens het laden en initialen als er nog geen foto is.
//
// `sizes` vertelt de browser hoe breed de foto op het scherm staat, zodat hij
// uit de srcset de kleinste passende variant kiest. Voorbeeld voor een kaart in
// een raster: "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw".
export function AvatarImage({
  row,
  name,
  prefer = 512,
  sizes,
  className = "",
  imgClassName = "h-full w-full object-cover",
  priority = false,
}: {
  row: {
    avatar_url?: string | null
    avatar_variants?: unknown
    avatar_blur?: unknown
  } | null
  name: string
  prefer?: AvatarWidth
  sizes?: string
  className?: string
  imgClassName?: string
  priority?: boolean
}) {
  const { src, srcSet, blur } = avatarSource(row, prefer)

  if (!src) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface font-semibold text-muted ${className}`}
      >
        {initialsOf(name)}
      </div>
    )
  }

  return (
    <div
      className={`h-full w-full ${className}`}
      style={
        blur
          ? {
              backgroundImage: `url(${blur})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? (sizes ?? "512px") : undefined}
        alt={name}
        width={prefer}
        height={prefer}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={imgClassName}
      />
    </div>
  )
}
