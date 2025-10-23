import { ref } from 'vue'
import { useApiStore } from '@/core/stores/api'
import { useNotificationStore } from '@/core/stores/notification'

/**
 * useApi composable
 *
 * Wrapper around unified messaging API store.
 * Handles request/response lifecycle, loading state, error handling.
 *
 * Example:
 * const { request, loading, error } = useApi()
 * await request('workflow.list', { limit: 10 })
 */

interface ApiResult<T> {
  data: T | null
  error: string | null
}

export function useApi() {
  const api = useApiStore()
  const notify = useNotificationStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function request<T = any>(action: string, payload: Record<string, any>): Promise<ApiResult<T>> {
    loading.value = true
    error.value = null
    try {
      // Use the existing messaging system instead of direct API calls
      const { sendMessage } = await import('@/core/messaging/api')
      
      // Create promise that resolves when response arrives
      const responsePromise = new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Request timeout for ${action}`))
        }, 10000) // 10 second timeout
        
        // Register one-time handler for this specific action
        const handleResponse = (data: any) => {
          clearTimeout(timeout)
          resolve(data)
        }
        
        const handleError = (error: string) => {
          clearTimeout(timeout)
          reject(new Error(error))
        }
        
        // Send message and wait for response
        sendMessage(action, payload, handleResponse, handleError)
      })
      
      // Wait for response
      const data = await responsePromise
      return { data, error: null }
      
    } catch (e: any) {
      const msg = e?.message || 'API error'
      error.value = msg
      notify.error(msg)
      return { data: null, error: msg }
    } finally {
      loading.value = false
    }
  }

  return {
    request,
    loading,
    error,
  }
}