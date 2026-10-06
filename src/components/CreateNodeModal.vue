<script setup lang="ts">
import { h, reactive, ref } from 'vue'
import {
  NButton,
  NForm,
  NFormItem,
  NModal,
  NSelect,
  NTreeSelect,
  type FormInst,
  type FormItemRule,
  type SelectOption,
  type TreeSelectOption,
} from 'naive-ui'
import { CREATABLE_NODE_TYPES, NODE_TYPES } from '@/constants/nodeTypes'
import type { CreatableNodeType, CreateNodeValues } from '@/types/flow'
import type { ConnectTreeOption } from '@/utils/connectTree'
import { vControlLabel } from '@/directives/controlLabel'
import NodeBasicsFields from './editors/NodeBasicsFields.vue'

withDefaults(
  defineProps<{
    /** The flow as a tree (see `buildConnectTree`), for choosing where the step goes. */
    parentOptions?: ConnectTreeOption[]
    loading?: boolean
  }>(),
  { parentOptions: () => [], loading: false },
)

const emit = defineEmits<{ submit: [values: CreateNodeValues, parentId: string] }>()

const show = defineModel<boolean>('show', { required: true })
/** Step the new one is added after. Owned by the parent so the canvas can highlight it. */
const parentId = defineModel<string | null>('parentId', { default: null })

interface FormModel {
  title: string
  description: string
  type: CreatableNodeType | null
}

const emptyForm = (): FormModel => ({ title: '', description: '', type: null })
const form = reactive<FormModel>(emptyForm())
const formRef = ref<FormInst | null>(null)

const parentRule: FormItemRule = {
  required: true,
  validator: () => (parentId.value ? true : new Error('Choose where to add the step')),
  trigger: ['change', 'blur'],
}

const typeRule: FormItemRule = {
  required: true,
  message: 'Select a node type',
  trigger: ['change', 'blur'],
}

const typeOptions: SelectOption[] = CREATABLE_NODE_TYPES.map((type) => ({
  label: NODE_TYPES[type].label,
  value: type,
}))

// Show each type's icon next to its label in the dropdown and the selected value.
function renderTypeLabel(option: SelectOption) {
  const meta = NODE_TYPES[option.value as CreatableNodeType]
  return h('span', { class: 'flex items-center gap-2' }, [
    h(meta.icon, { class: 'size-4 shrink-0', style: { color: meta.color }, 'aria-hidden': 'true' }),
    meta.label,
  ])
}

const BRANCH_STYLES = {
  success: 'bg-emerald-50 text-emerald-700',
  failure: 'bg-rose-50 text-rose-700',
} as const

// Icon + title for steps, a small pill for Success/Failure.
function renderParentLabel({ option }: { option: TreeSelectOption }) {
  const { kind, label } = option as unknown as ConnectTreeOption
  if (kind === 'success' || kind === 'failure') {
    return h(
      'span',
      { class: `rounded px-1.5 py-0.5 text-xs font-semibold ${BRANCH_STYLES[kind]}` },
      label,
    )
  }
  const meta = NODE_TYPES[kind]
  return h('span', { class: 'inline-flex items-center gap-2' }, [
    h(meta.icon, { class: 'size-4 shrink-0', style: { color: meta.color }, 'aria-hidden': 'true' }),
    label,
  ])
}

async function onSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  emit(
    'submit',
    {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type as CreatableNodeType,
    },
    parentId.value as string,
  )
}

// Clear the form once the close animation has finished.
function onAfterLeave() {
  Object.assign(form, emptyForm())
  formRef.value?.restoreValidation()
}
</script>

<template>
  <!-- Dialog preset (not card): Naive's card header has role="heading" without a level. -->
  <NModal
    v-model:show="show"
    preset="dialog"
    title="Create New Node"
    aria-label="Create New Node"
    :show-icon="false"
    class="w-120! max-w-[calc(100vw-2rem)]"
    :mask-closable="!loading"
    :close-on-esc="!loading"
    :closable="!loading"
    @after-leave="onAfterLeave"
  >
    <NForm ref="formRef" :model="form" label-placement="top" @submit.prevent="onSubmit">
      <NodeBasicsFields
        v-model:title="form.title"
        v-model:description="form.description"
        title-placeholder="e.g. Away Message"
      />

      <NFormItem label="Type of Node" path="type" :rule="typeRule">
        <NSelect
          v-model:value="form.type"
          v-control-label="'Type of Node'"
          :options="typeOptions"
          :render-label="renderTypeLabel"
          :virtual-scroll="false"
          placeholder="Select a node type"
        />
      </NFormItem>

      <NFormItem label="Connect after" path="parentId" :rule="parentRule">
        <!-- NTreeSelect's root isn't a single element, so the wrapper carries the label -->
        <div v-control-label="'Connect after'" class="w-full">
          <NTreeSelect
            :value="parentId"
            :options="parentOptions"
            :render-label="renderParentLabel"
            :virtual-scroll="false"
            default-expand-all
            filterable
            placeholder="Choose the step to add after"
            @update:value="parentId = ($event as string | null) ?? null"
          />
        </div>
      </NFormItem>

      <!-- Lets Enter in the title field submit the form -->
      <button type="submit" class="hidden" aria-hidden="true" tabindex="-1" />
    </NForm>

    <template #action>
      <div class="flex justify-end gap-2">
        <NButton :disabled="loading" @click="show = false">Cancel</NButton>
        <NButton type="primary" :loading="loading" @click="onSubmit">Create</NButton>
      </div>
    </template>
  </NModal>
</template>
