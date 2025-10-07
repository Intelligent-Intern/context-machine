// src/composables/useValidation.ts
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useErrorStore } from '@/core/stores/error'

/**
 * useValidation Composable
 *
 * Bindet sich an den ErrorStore und filtert VALIDATION-Fehler für eine bestimmte Action.
 * Kann in Formularen genutzt werden, um Felder inline zu markieren und Summaries anzuzeigen.
 */
export function useValidation(action: string) {
    const errorStore = useErrorStore()
    const { errors } = storeToRefs(errorStore)

    // Alle Validation-Fehler zur angegebenen Action
    const validationErrors = computed(() =>
        errors.value.filter(
            e => e.source === action && e.code === 'VALIDATION'
        )
    )

    // Extrahiere Feldfehler
    const fieldMap = computed<Record<string, string>>(() => {
        const map: Record<string, string> = {}
        validationErrors.value.forEach(err => {
            if (err.details?.fields) {
                Object.entries(err.details.fields).forEach(([k, v]) => {
                    map[k] = String(v)
                })
            }
        })
        return map
    })

    return {
        any: computed(() => validationErrors.value.length > 0),
        fields: computed(() => Object.keys(fieldMap.value)),
        has: (field: string) => Boolean(fieldMap.value[field]),
        get: (field: string) => fieldMap.value[field] || null,
        all: validationErrors
    }
}
