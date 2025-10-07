import { useApiStore } from '@/core/stores/api'

interface Message {
  a: string
  p?: any
}

/**
 * Convenience-Client für Unified Messaging.
 * Stellt Kurzbefehle bereit, um Nachrichten zu senden.
 */
export class ApiClient {
  private api = useApiStore()

  /**
   * Sendet eine einzelne Action mit optionalem Payload.
   */
  async send(a: string, p?: any) {
    const msg: Message = { a, p }
    return this.api.send([msg])
  }

  /**
   * Sendet mehrere Actions gleichzeitig (Batch).
   */
  async batch(messages: Message[]) {
    return this.api.send(messages)
  }

  /**
   * Spezielle CRUD-Helfer (Konvention: <domain>.<entity>.<action>)
   */
  async list(domain: string, entity: string, payload?: any) {
    return this.send(`${domain}.${entity}.list`, payload)
  }

  async get(domain: string, entity: string, payload: { id: string | number }) {
    return this.send(`${domain}.${entity}.get`, payload)
  }

  async create(domain: string, entity: string, payload: any) {
    return this.send(`${domain}.${entity}.create`, payload)
  }

  async update(domain: string, entity: string, payload: any) {
    return this.send(`${domain}.${entity}.update`, payload)
  }

  async remove(domain: string, entity: string, payload: { id: string | number }) {
    return this.send(`${domain}.${entity}.delete`, payload)
  }
}

/**
 * Factory-Funktion, um pro Komponente einen Client zu holen.
 */
export function useApiClient() {
  return new ApiClient()
}
