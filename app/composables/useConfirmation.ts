import type { ComponentPublicInstance } from 'vue'

/**
 * An action confirmed in the page itself, never in a dialog of the browser
 * (UiConfirmation). The question takes the focus when it shows; the focus
 * comes back to the button that asked once it is dismissed.
 */
export function useConfirmation(trigger: Readonly<Ref<ComponentPublicInstance | HTMLElement | null>>) {
  const confirming = ref(false)
  const pending = ref(false)
  const failure = ref<string | null>(null)

  function ask(): void {
    failure.value = null
    confirming.value = true
  }

  async function dismiss(): Promise<void> {
    confirming.value = false
    failure.value = null
    await nextTick()
    const element: unknown = trigger.value instanceof HTMLElement ? trigger.value : trigger.value?.$el
    if (element instanceof HTMLElement) element.focus()
  }

  /**
   * Runs the confirmed action: null once done, or its message, shown with the question.
   *
   * @returns whether the action went through.
   */
  async function confirm(action: () => Promise<string | null>): Promise<boolean> {
    pending.value = true
    failure.value = await action()
    pending.value = false
    return failure.value === null
  }

  return { confirming, pending, failure, ask, dismiss, confirm }
}
