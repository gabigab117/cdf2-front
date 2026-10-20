import type { components } from '~/types/api'
import type { Written } from '~/utils/api-errors'
import type { LineFields } from '~/utils/stock'

type StockDirection = components['schemas']['StockDirection']
type StockItemIn = components['schemas']['StockItemIn']
type StockItemOut = components['schemas']['StockItemOut']
type StockOperationIn = components['schemas']['StockOperationIn']
type StockOperationOut = components['schemas']['StockOperationOut']
type StockOrderOut = components['schemas']['StockOrderOut']
type StocktakeIn = components['schemas']['StocktakeIn']

/**
 * Writes the stock. Each write gives what it wrote, or the errors to show, and
 * reads the bell again, which lists the items below their threshold. A write
 * made on the Stock page (a click on − or +, a delivery received or cancelled)
 * reads the stock again; the others are made elsewhere, and the Stock page
 * reads the stock as it mounts.
 */
export function useStockWrites() {
  const api = useApi()

  async function written<T>(write: Promise<Written<T>>): Promise<Written<T>> {
    const result = await write
    if (!result.errors) void refreshBoardOverview()
    return result
  }

  async function done(write: Promise<string | null>): Promise<string | null> {
    const failure = await write
    if (failure === null) void refreshBoardOverview()
    return failure
  }

  function path(id: number) {
    return { params: { path: { item_id: id } } }
  }

  /** Adds an item, with nothing in stock yet. */
  function addItem(payload: StockItemIn): Promise<Written<StockItemOut>> {
    return written(formWrite(api.POST('/api/board/stock/items', { body: payload })))
  }

  /** Rewrites an item whole: its movements stay as they are. */
  function changeItem(id: number, payload: StockItemIn): Promise<Written<StockItemOut>> {
    return written(formWrite(api.PUT('/api/board/stock/items/{item_id}', { ...path(id), body: payload })))
  }

  /** Deletes an item that has never moved: null once done, or the message to show. */
  function deleteItem(id: number): Promise<string | null> {
    return done(plainWrite(api.DELETE('/api/board/stock/items/{item_id}', path(id))))
  }

  /**
   * A click on − or +: the item's step, in or out, recorded with the member.
   * Null once done, or the message to show.
   */
  async function adjustItem(id: number, direction: StockDirection): Promise<string | null> {
    const failure = await done(plainWrite(api.POST('/api/board/stock/items/{item_id}/adjustments', { ...path(id), body: { direction } })))
    if (failure === null) void refreshStock()
    return failure
  }

  /** « Entrée ou sortie »: several items in or out at once, for one reason. */
  function recordOperation(payload: StockOperationIn): Promise<Written<StockOperationOut>> {
    return written(formWrite(api.POST('/api/board/stock/operations', { body: payload })))
  }

  /** « Faire l’inventaire »: what each item counted, an item left out not counted. */
  function recordStocktake(payload: StocktakeIn): Promise<Written<StockOperationOut>> {
    return written(formWrite(api.POST('/api/board/stock/stocktakes', { body: payload })))
  }

  function orderPath(id: number) {
    return { params: { path: { document_id: id } } }
  }

  /** The lines of an order, all at once, until it is received. */
  function writeOrderLines(id: number, lines: LineFields[]): Promise<Written<StockOrderOut>> {
    return written(formWrite(api.PUT('/api/board/stock/orders/{document_id}/lines', { ...orderPath(id), body: { lines: linesPayload(lines) } })))
  }

  /**
   * « Réceptionner la livraison », or « Annuler » the day it was received:
   * null once done, or the message to show. Both are made on the Stock page,
   * which reads the stock again.
   */
  async function deliverOrder(id: number, cancel: boolean): Promise<string | null> {
    const request = cancel
      ? api.DELETE('/api/board/stock/orders/{document_id}/delivery', orderPath(id))
      : api.POST('/api/board/stock/orders/{document_id}/delivery', orderPath(id))
    const failure = await done(plainWrite(request))
    if (failure === null) void refreshStock()
    return failure
  }

  return { addItem, changeItem, deleteItem, adjustItem, recordOperation, recordStocktake, writeOrderLines, deliverOrder }
}
