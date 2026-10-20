import type { DOMWrapper, VueWrapper } from '@vue/test-utils'

/** The control a label names, in a mounted page or form. */
export function field(view: VueWrapper, label: string) {
  const tag = view.findAll('label').find(candidate => candidate.text().startsWith(label))
  if (!tag) throw new Error(`No field « ${label} »`)
  return view.get(`[id="${tag.attributes('for')}"]`)
}

/** The button its text or its label names, if the view shows one. */
export function button(view: VueWrapper | DOMWrapper<Element>, name: string) {
  return view.findAll('button').find(candidate => candidate.text() === name || candidate.attributes('aria-label') === name)
}
