import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SiteAlbumCard from '~/components/site/AlbumCard.vue'
import SiteEventCover from '~/components/site/EventCover.vue'
import SiteMemories from '~/components/site/Memories.vue'
import SitePhotoGrid from '~/components/site/PhotoGrid.vue'
import SitePreviousEditionAlbum from '~/components/site/PreviousEditionAlbum.vue'
import { page } from '../../helpers/events'
import { publicAlbum, publicAlbumItem } from '../../helpers/photos'
import { readable } from '../../helpers/text'

enableAutoUnmount(afterEach)

describe('SiteAlbumCard', () => {
  it('leads to its album, with its cover, its number of photos and its day', async () => {
    const card = await mountSuspended(SiteAlbumCard, { props: { album: publicAlbumItem({ photos_count: 128 }) } })

    expect(card.get('a').attributes('href')).toBe('/souvenirs/5-brocante-2026')
    expect(card.get('img').attributes()).toMatchObject({ src: '/api/public/photos/41/thumbnail', alt: '', loading: 'lazy' })
    expect(card.findAll('a > span:first-child > span').map(part => readable(part.text()))).toEqual(['Brocante 2026', 'Dimanche 13 septembre 2026'])
    expect(card.get('a > span:last-child').text()).toBe('128 photos')
  })
})

describe('SiteMemories', () => {
  it('shows the latest albums, and leads to all of them', async () => {
    const memories = await mountSuspended(SiteMemories, { props: { albums: page([publicAlbumItem()]) } })

    expect(memories.get('section').attributes('id')).toBe('souvenirs')
    expect(memories.get('h2').text()).toBe('Souvenirs')
    expect(memories.findAll('li')).toHaveLength(1)
    expect(memories.get('a[href="/souvenirs"]').text()).toBe('Tous les albums')
  })

  it('says the photos are to come while the site has no album', async () => {
    const memories = await mountSuspended(SiteMemories, { props: { albums: page([]) } })

    expect(memories.text()).toContain('Les photos des prochaines fêtes arriveront ici.')
    expect(memories.find('a').exists()).toBe(false)
  })

  it('says so when the albums cannot be read', async () => {
    const memories = await mountSuspended(SiteMemories, { props: { albums: null, failed: true } })

    expect(memories.text()).toContain('Les albums ne peuvent pas s’afficher pour le moment.')
    expect(memories.find('ul').exists()).toBe(false)
  })
})

describe('SitePhotoGrid', () => {
  const album = publicAlbum({ photos: [41, 42, 43], photos_count: 3 })

  async function viewer(index = 0) {
    const grid = await mountSuspended(SitePhotoGrid, { props: { album } })
    await grid.findAll('a')[index]?.trigger('click')
    const dialog = grid.get('dialog')
    await vi.waitFor(() => expect((dialog.element as HTMLDialogElement).open).toBe(true))
    return { grid, dialog }
  }

  it('links each photo to its large size: without JavaScript, the browser opens it', async () => {
    const grid = await mountSuspended(SitePhotoGrid, { props: { album } })

    expect(grid.findAll('a').map(link => [link.attributes('href'), link.attributes('aria-label')])).toEqual([
      ['/api/public/photos/41/display', 'Agrandir la photo 1 sur 3'],
      ['/api/public/photos/42/display', 'Agrandir la photo 2 sur 3'],
      ['/api/public/photos/43/display', 'Agrandir la photo 3 sur 3'],
    ])
    expect(grid.findAll('img').map(image => image.attributes('src'))).toEqual([
      '/api/public/photos/41/thumbnail',
      '/api/public/photos/42/thumbnail',
      '/api/public/photos/43/thumbnail',
    ])
    expect(grid.find('dialog').exists()).toBe(false)
  })

  it('opens a photo in the viewer, with the album\'s title and its place, and no name', async () => {
    const { dialog } = await viewer(1)

    expect(dialog.get('h2').text()).toBe('Brocante 2026')
    expect(dialog.get('header').text()).toContain('Photo 2 sur 3')
    expect(dialog.get('img').attributes()).toMatchObject({ src: '/api/public/photos/42/display', alt: 'Photo 2 sur 3' })
  })

  it('goes from one photo to the next with its buttons, up to both ends', async () => {
    const { dialog } = await viewer()
    const previous = dialog.get('button[aria-label="Photo précédente"]')
    const next = dialog.get('button[aria-label="Photo suivante"]')
    expect(previous.attributes('disabled')).toBeDefined()

    await next.trigger('click')
    await next.trigger('click')

    expect(dialog.get('img').attributes('src')).toBe('/api/public/photos/43/display')
    expect(next.attributes('disabled')).toBeDefined()
    expect(previous.attributes('disabled')).toBeUndefined()
  })

  it('goes from one photo to the next with the arrows of the keyboard', async () => {
    const { dialog } = await viewer(1)

    await dialog.trigger('keydown', { key: 'ArrowRight' })
    expect(dialog.get('img').attributes('src')).toBe('/api/public/photos/43/display')
    await dialog.trigger('keydown', { key: 'ArrowRight' })
    expect(dialog.get('img').attributes('src')).toBe('/api/public/photos/43/display')

    await dialog.trigger('keydown', { key: 'ArrowLeft' })
    await dialog.trigger('keydown', { key: 'ArrowLeft' })
    await dialog.trigger('keydown', { key: 'ArrowLeft' })
    expect(dialog.get('img').attributes('src')).toBe('/api/public/photos/41/display')
  })
})

describe('SitePreviousEditionAlbum', () => {
  it('shows the first photos of last year\'s album, and how many more it holds', async () => {
    const album = publicAlbum({ photos: [1, 2, 3, 4, 5, 6], photos_count: 64, title: 'Halloween 2025' })

    const block = await mountSuspended(SitePreviousEditionAlbum, { props: { album } })

    expect(block.get('h2').text()).toBe('L’an dernier')
    expect(block.get('a').attributes('href')).toBe('/souvenirs/5-brocante-2026')
    expect(readable(block.get('a').text())).toBe('Album Halloween 2025 · 64 photos')
    expect(block.findAll('img').map(image => image.attributes('src'))).toEqual(
      [1, 2, 3, 4, 5, 6].map(photo => `/api/public/photos/${photo}/thumbnail`),
    )
    expect(block.findAll('li').map(tile => tile.text())).toEqual(['', '', '', '', '', '+58'])
  })

  it('tells of no more photos when it shows them all', async () => {
    const album = publicAlbum({ photos: [1, 2, 3, 4, 5, 6], photos_count: 6 })

    const block = await mountSuspended(SitePreviousEditionAlbum, { props: { album } })

    expect(block.findAll('li').map(tile => tile.text())).toEqual(['', '', '', '', '', ''])
  })
})

describe('SiteEventCover', () => {
  it('shows the cover in its display size, under the chevron of the coat of arms', async () => {
    const cover = await mountSuspended(SiteEventCover, { props: { cover: 41 } })

    expect(cover.get('img').attributes()).toMatchObject({ src: '/api/public/photos/41/display', alt: '' })
    expect(cover.get('[aria-hidden="true"]').classes()).toContain('chevron-band')
  })
})
