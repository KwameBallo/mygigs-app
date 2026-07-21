export const LOCALES = ["nl", "en"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "nl"
export const LOCALE_COOKIE = "locale"
