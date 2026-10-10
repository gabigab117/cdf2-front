<!-- The public site: its header, with its menu on a phone, and its footer, which
leads to the legal pages. -->
<template>
  <div class="flex min-h-dvh flex-col bg-argent-50 text-base text-sable-950">
    <SitePreprodBanner />
    <SiteHeader />
    <main class="flex flex-1 flex-col">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
