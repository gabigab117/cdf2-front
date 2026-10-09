/**
 * The metadata of a page of the public site: its title and description, as
 * search engines and shared links show them, and its canonical address, the
 * page's own without any query.
 */
export function useSitePage({ title, description }: { title: MaybeRefOrGetter<string>, description: MaybeRefOrGetter<string> }): void {
  const { siteUrl } = useRuntimeConfig().public
  const route = useRoute()
  const url = computed(() => (siteUrl ? new URL(route.path, siteUrl).href : undefined))

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogLocale: 'fr_FR',
    ogSiteName: SITE_NAME,
    ogUrl: url,
  })
  useHead({ link: () => (url.value ? [{ rel: 'canonical', href: url.value }] : []) })
}
