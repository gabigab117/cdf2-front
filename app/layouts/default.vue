<!-- The public site. The links of its header and footer come with the pages
they lead to: the agenda and the committee (card 2.4), the legal pages (2.5). -->
<template>
  <div class="flex min-h-dvh flex-col bg-argent-50 text-base text-sable-950">
    <SiteHeader />
    <main class="flex flex-1 flex-col">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
