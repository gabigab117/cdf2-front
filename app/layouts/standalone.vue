<!-- A page on its own, outside the public site: the sign-in page, which only
board members reach by its address, and the error page. -->
<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-8 bg-argent-50 px-4 py-12 text-base text-sable-950">
    <div class="flex items-center gap-3">
      <UiCoatOfArms class="h-8.5 w-7.5" />
      <span class="flex flex-col leading-none">
        <span class="font-display text-title font-bold tracking-brand">Comité des Fêtes</span>
        <span class="mt-0.5 text-caption tracking-place text-argent-600">Ons-en-Bray</span>
      </span>
    </div>
    <main class="flex w-full flex-col items-center gap-6">
      <slot />
    </main>
  </div>
</template>
