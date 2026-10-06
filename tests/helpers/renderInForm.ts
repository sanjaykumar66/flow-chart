import { defineComponent, h, reactive, ref, type Component } from 'vue'
import { NForm, type FormInst, type FormValidationError } from 'naive-ui'
import { render } from '@testing-library/vue'

/**
 * Renders an editor inside an NForm, wiring each model key as a `v-model:<key>`
 * (the editors' rules live on their NFormItems, so they need a parent form to validate).
 */
export function renderInForm<M extends Record<string, unknown>>(
  component: Component,
  initialModel: M,
  props: Record<string, unknown> = {},
) {
  const model = reactive({ ...initialModel }) as M
  const formRef = ref<FormInst | null>(null)

  const Harness = defineComponent({
    setup() {
      return () =>
        h(NForm, { ref: formRef, model }, () => {
          const bindings: Record<string, unknown> = { ...props }
          for (const key of Object.keys(model)) {
            bindings[key] = model[key]
            bindings[`onUpdate:${key}`] = (value: unknown) => {
              ;(model as Record<string, unknown>)[key] = value
            }
          }
          return h(component, bindings)
        })
    },
  })

  const utils = render(Harness)

  /** Runs the form's validation and returns the error messages (empty when valid). */
  async function validate(): Promise<string[]> {
    try {
      await formRef.value?.validate()
      return []
    } catch (errors) {
      return (errors as FormValidationError[]).flat().map((error) => error.message ?? '')
    }
  }

  return { ...utils, model, validate }
}
