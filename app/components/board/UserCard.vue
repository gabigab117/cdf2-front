<script setup lang="ts">
import { LogOut } from '@lucide/vue'

const session = useSessionStore()

// The name, or the address of an account created without one.
const name = computed(() => (session.member ? memberName(session.member) : null))

const signingOut = ref(false)
const failure = ref<string | null>(null)

async function signOut(): Promise<void> {
  signingOut.value = true
  failure.value = await session.signOut()
  signingOut.value = false
  if (!failure.value) await navigateTo(SIGN_IN_PATH)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex min-h-15 items-center gap-3 rounded-search bg-sable-850 p-3">
      <template v-if="name">
        <UiAvatar :name />
        <span class="flex min-w-0 flex-1 flex-col leading-tight">
          <span class="truncate text-sm font-medium text-white">{{ name }}</span>
          <span
            v-if="session.member?.position"
            class="truncate text-caption text-argent-450"
          >{{ session.member.position }}</span>
        </span>
      </template>
      <UiIconButton
        class="ml-auto"
        label="Se déconnecter"
        size="sm"
        surface="dark"
        :disabled="signingOut"
        @click="signOut"
      >
        <LogOut :size="18" />
      </UiIconButton>
    </div>
    <p
      v-if="failure"
      role="alert"
      class="px-1 text-caption text-ambre-400"
    >
      {{ failure }}
    </p>
  </div>
</template>
