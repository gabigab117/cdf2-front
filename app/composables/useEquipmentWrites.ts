import type { components } from '~/types/api'
import type { Written } from '~/utils/api-errors'

type EquipmentIn = components['schemas']['EquipmentIn']
type EquipmentOut = components['schemas']['EquipmentOut']

/**
 * Writes the inventory. Each write gives what it wrote, or the errors to show
 * on its form; the page fetches the inventory again.
 */
export function useEquipmentWrites() {
  const api = useApi()

  function addEquipment(payload: EquipmentIn): Promise<Written<EquipmentOut>> {
    return formWrite(api.POST('/api/board/equipment', { body: payload }))
  }

  /** Rewrites an equipment whole, such as pieces put back in service. */
  function changeEquipment(id: number, payload: EquipmentIn): Promise<Written<EquipmentOut>> {
    const path = { equipment_id: id }
    return formWrite(api.PUT('/api/board/equipment/{equipment_id}', { params: { path }, body: payload }))
  }

  /** @returns null once deleted, or the message to show. */
  function deleteEquipment(id: number): Promise<string | null> {
    return plainWrite(api.DELETE('/api/board/equipment/{equipment_id}', { params: { path: { equipment_id: id } } }))
  }

  return { addEquipment, changeEquipment, deleteEquipment }
}
