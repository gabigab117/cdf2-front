import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NotesCard from '~/components/notes/Card.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { julie } from '../../helpers/events'
import { boardNote, marc, noteReply } from '../../helpers/notes'

const NOTE = '/api/board/notes/{note_id}'

function mountCard(note = boardNote()) {
  return mountSuspended(NotesCard, { props: { note, leadId: julie.id }, attachTo: document.body })
}

type Mounted = Awaited<ReturnType<typeof mountCard>>

function button(wrapper: Mounted, name: string) {
  return wrapper.findAll('button').find(element => element.text() === name || element.attributes('aria-label') === name)
}

describe('a note of the board', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-10T08:00:00Z')
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('offers its author alone to pin, rewrite or delete it', async () => {
    const others = await mountCard(boardNote({ editable: false }))
    const own = await mountCard(boardNote({ editable: true }))

    expect(button(others, 'Modifier la note')).toBeUndefined()
    expect(['Épingler la note', 'Modifier la note', 'Supprimer la note'].map(name => button(own, name)?.exists())).toEqual([true, true, true])
  })

  it('names a former member, whose account is gone', async () => {
    const card = await mountCard(boardNote({ author: null }))

    expect(card.text()).toContain('Ancien membre')
  })

  it('pins a note, its text and tag kept', async () => {
    mockApi(NOTE, { method: 'PUT', handler: () => apiResponse(200, boardNote({ pinned: true })) }, { note_id: 31 })
    const sent = recordRequests()
    const card = await mountCard(boardNote({ editable: true }))

    await button(card, 'Épingler la note')!.trigger('click')

    await vi.waitFor(() => expect(card.emitted('changed')).toHaveLength(1))
    expect(sent[0]?.body).toEqual({ text: boardNote().text, tag: 'minutes', pinned: true })
  })

  it('says why a note could not be pinned', async () => {
    mockApi(NOTE, { method: 'PUT', handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { note_id: 31 })
    const card = await mountCard(boardNote({ editable: true, pinned: true }))

    await button(card, 'Désépingler la note')!.trigger('click')

    await vi.waitFor(() => expect(card.get('[role="alert"]').text()).toBe('Introuvable.'))
    expect(card.emitted('changed')).toBeUndefined()
  })

  it('rewrites a note in place, its pin kept', async () => {
    mockApi(NOTE, { method: 'PUT', handler: () => apiResponse(200, boardNote()) }, { note_id: 31 })
    const sent = recordRequests()
    const card = await mountCard(boardNote({ editable: true, pinned: true }))

    await button(card, 'Modifier la note')!.trigger('click')
    expect((card.get('textarea').element as HTMLTextAreaElement).value).toBe(boardNote().text)
    await card.get('textarea').setValue('Parcours validé.')
    await card.get('select').setValue('budget')
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(card.emitted('changed')).toHaveLength(1))
    expect(sent[0]?.body).toEqual({ text: 'Parcours validé.', tag: 'budget', pinned: true })
    expect(card.find('form textarea').exists()).toBe(false)
  })

  it('leaves a note as it was when its author changes their mind', async () => {
    const card = await mountCard(boardNote({ editable: true }))

    await button(card, 'Modifier la note')!.trigger('click')
    await button(card, 'Annuler')!.trigger('click')

    expect(card.find('form textarea').exists()).toBe(false)
  })

  it('deletes a note in the page, saying its replies go with it', async () => {
    const handler = vi.fn(() => new Response(null, { status: 204 }))
    mockApi(NOTE, { method: 'DELETE', handler }, { note_id: 31 })
    const card = await mountCard(boardNote({ editable: true, replies: [noteReply(), noteReply({ id: 42 })] }))

    await button(card, 'Supprimer la note')!.trigger('click')
    expect(card.text()).toContain('Supprimer cette note ?Ses 2 réponses sont supprimées avec elle.')
    await button(card, 'Supprimer définitivement')!.trigger('click')

    await vi.waitFor(() => expect(card.emitted('changed')).toHaveLength(1))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('names the single reply that goes with a note', async () => {
    const card = await mountCard(boardNote({ editable: true, replies: [noteReply()] }))

    await button(card, 'Supprimer la note')!.trigger('click')

    expect(card.text()).toContain('Sa réponse est supprimée avec elle.')
  })

  it('folds its replies under « N réponses », and sends a reply', async () => {
    /**
     * Given a note with two replies, the second by the signed-in member
     * When a member unfolds them, then replies
     * Then the replies show, the member's own changeable, and the reply is sent
     */
    mockApi('/api/board/notes/{note_id}/replies', { method: 'POST', handler: () => apiResponse(201, noteReply()) }, { note_id: 31 })
    const sent = recordRequests()
    const card = await mountCard(boardNote({ replies: [noteReply(), noteReply({ id: 42, author: marc, editable: true })] }))
    const toggle = button(card, '2 réponses')!
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(card.findAll('li')).toHaveLength(2)
    expect(card.findAll('button[aria-label="Modifier la réponse"]')).toHaveLength(1)
    await card.get('form textarea').setValue('Merci !')
    await card.get('form').trigger('submit')
    await vi.waitFor(() => expect(card.emitted('changed')).toHaveLength(1))
    expect(sent[0]?.body).toEqual({ text: 'Merci !' })
  })

  it('offers to reply to a note without replies, and tells one reply alone', async () => {
    const lone = await mountCard(boardNote())
    const answered = await mountCard(boardNote({ replies: [noteReply()] }))

    expect(button(lone, 'Répondre')?.exists()).toBe(true)
    expect(button(answered, '1 réponse')?.exists()).toBe(true)
  })

  it('rewrites and deletes a reply of its author', async () => {
    mockApi(NOTE, { method: 'PUT', handler: () => apiResponse(200, boardNote()) }, { note_id: 41 })
    mockApi(NOTE, { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { note_id: 41 })
    const sent = recordRequests()
    const card = await mountCard(boardNote({ replies: [noteReply({ editable: true })] }))
    await button(card, '1 réponse')!.trigger('click')

    await button(card, 'Modifier la réponse')!.trigger('click')
    const forms = card.findAll('form')
    await forms[0]!.get('textarea').setValue('C’est fait.')
    await forms[0]!.trigger('submit')
    await vi.waitFor(() => expect(card.emitted('changed')).toHaveLength(1))
    await button(card, 'Supprimer la réponse')!.trigger('click')
    expect(card.text()).toContain('Supprimer cette réponse ?')
    await button(card, 'Supprimer définitivement')!.trigger('click')
    await vi.waitFor(() => expect(card.emitted('changed')).toHaveLength(2))

    expect(sent.map(request => [request.method, request.body])).toEqual([
      ['PUT', { text: 'C’est fait.', tag: null, pinned: false }],
      ['DELETE', undefined],
    ])
  })

  it('brings the focus back to the button when the deletion of a reply is called off', async () => {
    const card = await mountCard(boardNote({ replies: [noteReply({ editable: true })] }))
    await button(card, '1 réponse')!.trigger('click')

    await button(card, 'Supprimer la réponse')!.trigger('click')
    expect(document.activeElement).toBe(card.get('[tabindex="-1"]').element)
    await button(card, 'Annuler')!.trigger('click')

    expect(document.activeElement).toBe(button(card, 'Supprimer la réponse')!.element)
  })
})
