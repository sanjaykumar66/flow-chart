<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  reactive,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { storeToRefs } from 'pinia'
import { NButton, NForm, NResult, NSpin, useDialog, useMessage, type FormInst } from 'naive-ui'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import AppToolbar from '@/components/AppToolbar.vue'
import BaseDrawer from '@/components/BaseDrawer.vue'
import BaseTooltip from '@/components/BaseTooltip.vue'
import MoreActionsMenu from '@/components/MoreActionsMenu.vue'
import UndoRedoButtons from '@/components/UndoRedoButtons.vue'
import FlowCanvas from '@/components/canvas/FlowCanvas.vue'
import NodeBasicsFields from '@/components/editors/NodeBasicsFields.vue'
import { useHotkey } from '@/composables/useHotkey'
import { useOpenedOnce } from '@/composables/useOpenedOnce'
import { useNodeRoute } from '@/composables/useNodeRoute'
import { useUndoRedo } from '@/composables/useUndoRedo'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { DRAWER_WIDTH, HIGHLIGHT_DURATION } from '@/constants/canvas'
import { isMac } from '@/utils/keyboard'
import { NODE_TYPES } from '@/constants/nodeTypes'
import {
  useCreateNode,
  useDeleteNode,
  useFlowQuery,
  useResetFlow,
  useUpdateNode,
} from '@/queries/flow'
import { useCanvasStore } from '@/stores/canvas'
import { useEditorStore } from '@/stores/editor'
import { useHistoryStore } from '@/stores/history'
import type { CreateNodeValues, XYPosition } from '@/types/flow'
import { buildConnectTree } from '@/utils/connectTree'
import {
  buildGraph,
  findSelectableAncestor,
  findSelectableNode,
  getNodeTitle,
  normalizeId,
  toNodeType,
} from '@/utils/flowGraph'
import {
  cloneNodeForm,
  emptyNodeForm,
  isSameNodeForm,
  toNodeForm,
  type NodeFormValues,
} from '@/utils/nodeForm'
import type { InsertTarget } from '@/utils/treeOps'

// ---- Loaded on first use: per-type editors and dialogs (keeps the first download small) ----
const SendMessageEditor = defineAsyncComponent(
  () => import('@/components/editors/SendMessageEditor.vue'),
)
const AddCommentEditor = defineAsyncComponent(
  () => import('@/components/editors/AddCommentEditor.vue'),
)
const BusinessHoursEditor = defineAsyncComponent(
  () => import('@/components/editors/BusinessHoursEditor.vue'),
)
const CreateNodeModal = defineAsyncComponent(() => import('@/components/CreateNodeModal.vue'))
const DeleteNodeModal = defineAsyncComponent(() => import('@/components/DeleteNodeModal.vue'))
const KeyboardShortcutsModal = defineAsyncComponent(
  () => import('@/components/KeyboardShortcutsModal.vue'),
)

// ---- Flow data: TanStack Query over the fake API (src/api/flowApi.ts) ----
const flowQuery = useFlowQuery()
const rawNodes = computed(() => flowQuery.data.value ?? [])
const status = computed(() =>
  flowQuery.isPending.value ? 'loading' : flowQuery.isError.value ? 'error' : 'ready',
)

const updateMutation = useUpdateNode()
const deleteMutation = useDeleteNode()
const createMutation = useCreateNode()

// ---- Client state in Pinia: dragged positions (canvas) and dialog state (editor) ----
const canvas = useCanvasStore()
const editor = useEditorStore()
const { createOpen, createParentId, deleteOpen } = storeToRefs(editor)
const createLoaded = useOpenedOnce(createOpen)
const deleteLoaded = useOpenedOnce(deleteOpen)

const history = useHistoryStore()

// Forget positions and history of nodes that were deleted.
watch(rawNodes, (nodes) => {
  if (status.value !== 'ready') return
  const ids = nodes.map((n) => normalizeId(n.id))
  canvas.prune(ids)
  history.forgetNodes(ids)
})

// ---- Selection follows the URL: /nodes/:nodeId opens that node's details ----
const { selectedId, toggleNode, openNode, closeNode, replaceWithFlow } = useNodeRoute()
const message = useMessage()
// ---- Telling the user what changed and where ----
/** Ask the canvas to bring a node into view (off screen or under the drawer). */
const focusRequest = ref<{ id: string; seq: number } | null>(null)
function focusNode(id: string) {
  focusRequest.value = { id, seq: (focusRequest.value?.seq ?? 0) + 1 }
}

/** Briefly highlight a node, e.g. the one undo/redo just changed. */
const highlightedId = ref<string | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | undefined
function highlightNode(id: string) {
  highlightedId.value = id
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => (highlightedId.value = null), HIGHLIGHT_DURATION)
}
onBeforeUnmount(() => clearTimeout(highlightTimer))

const undoRedo = useUndoRedo({
  onError: (text) => message.error(text),
  onApplied: (entry, direction) => {
    message.info(`${direction === 'undo' ? 'Undone' : 'Redone'}: ${entry.label}`)
    if (entry.kind === 'layout') {
      flowCanvas.value?.fitFlow() // many steps moved: show the whole flow
      return
    }
    highlightNode(entry.nodeId)
    focusNode(entry.nodeId)
  },
  // Undoing an edit of the open step would overwrite what's being typed: ask first.
  beforeApply: (entry) =>
    entry.kind === 'edit' && entry.nodeId === selectedId.value ? confirmDiscard() : true,
})

const selectedNode = computed(() => findSelectableNode(rawNodes.value, selectedId.value) ?? null)
const selectedType = computed(() => (selectedNode.value ? toNodeType(selectedNode.value) : null))
const selectedMeta = computed(() => (selectedType.value ? NODE_TYPES[selectedType.value] : null))

const drawerOpen = computed({
  get: () => selectedNode.value !== null,
  set: (open) => {
    if (!open) closeNode()
  },
})

// Unknown ids and Success/Failure links can't be opened: go back to the canvas.
watch(
  [selectedId, status],
  ([id]) => {
    if (status.value !== 'ready' || !id || selectedNode.value) return
    message.warning("That node doesn't exist or can't be opened.")
    replaceWithFlow()
  },
  { immediate: true },
)

const graph = computed(() =>
  buildGraph(rawNodes.value, {
    positions: canvas.positions,
    highlightedId: highlightedId.value,
    // While creating, highlight where the new step will go; otherwise the open step.
    selectedId: createOpen.value
      ? createParentId.value
      : selectedNode.value
        ? normalizeId(selectedNode.value.id)
        : null,
  }),
)

const formRef = ref<FormInst | null>(null)
const form = reactive<NodeFormValues>(emptyNodeForm())

// ---- Keyboard focus follows the drawer ----
const flowCanvas = useTemplateRef<InstanceType<typeof FlowCanvas>>('flowCanvas')
const drawer = useTemplateRef<InstanceType<typeof BaseDrawer>>('drawer')

// Opening a step moves focus to the drawer's title, so Tab goes straight into its fields.
// Closing it returns focus to the step's card (WCAG 2.4.3), unless the user already moved on.
watch(
  () => (selectedNode.value ? normalizeId(selectedNode.value.id) : null),
  async (id, previousId) => {
    if (id) {
      focusNode(id) // keep the opened step visible next to the drawer
      drawer.value?.focus()
      return
    }
    if (!previousId) return
    await nextTick()
    const active = document.activeElement
    const focusWasLost =
      !active || active === document.body || !!active.closest('.n-drawer, .n-modal-container')
    if (focusWasLost && !flowCanvas.value?.focusStep(previousId)) {
      document.querySelector<HTMLElement>('main')?.focus()
    }
  },
)

// ---- Keyboard shortcuts help ("?") ----
const shortcutsOpen = ref(false)
const shortcutsLoaded = useOpenedOnce(shortcutsOpen)
useHotkey(
  (event) => event.key === '?',
  () => (shortcutsOpen.value = true),
)

/** What the open step holds in storage, to fill the form and spot unsaved changes. */
const savedForm = computed(() => (selectedNode.value ? toNodeForm(selectedNode.value) : null))

// Fill the form when a node is opened, and when its saved data changes (save, undo, redo).
// Keyed on the content so unrelated cache updates (another step added) keep what's typed.
watch(
  () => savedForm.value && `${selectedId.value}:${JSON.stringify(savedForm.value)}`,
  () => {
    if (!savedForm.value) return
    Object.assign(form, cloneNodeForm(savedForm.value))
    nextTick(() => formRef.value?.restoreValidation())
  },
  { immediate: true },
)

// ---- Unsaved changes: ask before switching or closing the step, or leaving the page ----
const dialog = useDialog()
/** A dialog title that is also its accessible name (Naive doesn't link the two). */
const namedDialog = (title: string) => ({ title, 'aria-label': title })
const isDirty = () => savedForm.value !== null && !isSameNodeForm(form, savedForm.value)

function askToDiscard() {
  return new Promise<boolean>((resolve) => {
    const keepEditing = () => resolve(false)
    dialog.warning({
      ...namedDialog('Discard unsaved changes?'),
      content: `Your changes to “${savedForm.value?.title}” haven't been saved.`,
      positiveText: 'Discard',
      negativeText: 'Keep editing',
      onPositiveClick: () => resolve(true),
      onNegativeClick: keepEditing,
      onClose: keepEditing,
      onEsc: keepEditing,
      onMaskClick: keepEditing,
      onAfterLeave: keepEditing, // any other way out; no-op once answered
    })
  })
}

const { confirmDiscard, withoutGuard } = useUnsavedChanges({ isDirty, confirm: askToDiscard })

function onSelect(id: string) {
  toggleNode(id)
}

function onMove(id: string, position: XYPosition, source: 'drag' | 'keyboard' = 'drag') {
  const current = graph.value.nodes.find((n) => n.id === id)?.position
  if (current && current.x === position.x && current.y === position.y) return
  const node = rawNodes.value.find((n) => normalizeId(n.id) === id)
  undoRedo.recordMove(
    id,
    `Move “${node ? getNodeTitle(node) : id}”`,
    canvas.positions[id] ?? null, // null: it was at its auto-layout spot
    position,
    { keyboard: source === 'keyboard' },
  )
  canvas.moveNode(id, position)
  if (source === 'keyboard') focusNode(id) // keep it on screen while it's moved with the keys
}

// ---- Create: from the toolbar or a "+" on the canvas ----
// The brief doesn't say where a new node attaches, so the form asks ("Connect after"),
// pre-filled from where the user started.
const connectTree = computed(() => buildConnectTree(rawNodes.value))

/** Toolbar: pre-fill with the open step, unless it's Business Hours (pick a branch instead). */
function onToolbarCreate() {
  const node = selectedNode.value
  editor.startCreate(node && node.type !== 'dateTime' ? normalizeId(node.id) : null)
}

/** "+" on the canvas: pre-fill with the spot that was clicked. */
function onAdd(target: InsertTarget) {
  editor.startCreate(target.parentId, target)
}

function onCreate(values: CreateNodeValues, parentId: string) {
  const target = editor.insertTargetFor(parentId)
  createMutation.mutate(
    { values, target },
    {
      onSuccess: ({ id }) => {
        editor.closeCreate()
        message.success(`“${values.title}” added`)
        openNode(id) // open the new step so its content can be filled in
      },
      onError: (error) => message.error(error.message),
    },
  )
}

// ---- Edit ----
async function onSave() {
  const id = selectedId.value
  if (!id) return
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  const before = savedForm.value
  const after = cloneNodeForm(form)
  updateMutation.mutate(
    { id, values: after },
    {
      onSuccess: () => {
        if (before && !isSameNodeForm(before, after)) {
          undoRedo.recordEdit(id, `Edit “${after.title.trim() || before.title}”`, before, after)
        }
        message.success('Changes saved')
      },
      onError: (error) => message.error(error.message),
    },
  )
}

// ---- Resets (toolbar "More actions") ----
const undoShortcut = isMac() ? '⌘Z' : 'Ctrl+Z'

function onResetLayout() {
  undoRedo.resetLayout()
  flowCanvas.value?.fitFlow()
  message.info(`Layout reset. Press ${undoShortcut} to undo.`)
}

const resetMutation = useResetFlow()

/** Back to the original payload: steps, details and layout. Asks first; can't be undone. */
function onResetDemo() {
  dialog.warning({
    ...namedDialog('Reset the demo flow?'),
    content:
      'This brings back the original flow. Every step you added, edited or deleted, and any ' +
      "step you moved, will be lost. This can't be undone.",
    positiveText: 'Reset',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      await withoutGuard(closeNode) // an open step's unsaved edits go with the reset
      try {
        await resetMutation.mutateAsync()
      } catch (error) {
        message.error((error as Error).message)
        return
      }
      canvas.resetLayout()
      history.clear()
      flowCanvas.value?.fitFlow()
      message.success('Demo flow restored')
    },
  })
}

// ---- Delete ----
const canDelete = computed(() => selectedType.value !== null && selectedType.value !== 'trigger')
const deleteDetails = computed(() =>
  selectedType.value === 'businessHours'
    ? 'Its Success and Failure branches and every step under them will be removed too.'
    : '',
)

/** Where keyboard focus goes once the delete dialog has closed (WCAG 2.4.3). */
let focusAfterDelete: string | null | undefined

async function onDelete() {
  const id = selectedId.value
  if (!id) return
  const title = form.title
  const ancestorId = findSelectableAncestor(rawNodes.value, id) ?? null
  // Leave /nodes/:id first so the missing node isn't reported as invalid; edits go with it.
  await withoutGuard(closeNode)
  deleteMutation.mutate(id, {
    onSuccess: () => {
      focusAfterDelete = ancestorId // the step above the deleted one
      message.success(`“${title}” deleted`)
    },
    onError: (error) => {
      focusAfterDelete = id // it's still there
      message.error(error.message)
    },
    onSettled: () => editor.closeDelete(),
  })
}

/** After Cancel nothing is set, and Naive returns focus to the Delete button itself. */
async function onDeleteDialogClosed() {
  if (focusAfterDelete === undefined) return
  const target = focusAfterDelete
  focusAfterDelete = undefined
  await nextTick()
  if (!target || !flowCanvas.value?.focusStep(target)) {
    document.querySelector<HTMLElement>('main')?.focus()
  }
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <AppToolbar @create="onToolbarCreate">
      <template #actions>
        <UndoRedoButtons
          :can-undo="undoRedo.canUndo.value"
          :can-redo="undoRedo.canRedo.value"
          :undo-label="undoRedo.nextUndo.value?.label"
          :redo-label="undoRedo.nextRedo.value?.label"
          @undo="undoRedo.undo()"
          @redo="undoRedo.redo()"
        />
        <MoreActionsMenu
          :can-reset-layout="canvas.hasCustomLayout"
          @reset-layout="onResetLayout"
          @reset-demo="onResetDemo"
        />
        <BaseTooltip text="Keyboard shortcuts (?)">
          <NButton
            quaternary
            circle
            aria-label="Keyboard shortcuts"
            aria-keyshortcuts="?"
            @click="shortcutsOpen = true"
          >
            <template #icon><QuestionMarkCircleIcon aria-hidden="true" /></template>
          </NButton>
        </BaseTooltip>
      </template>
    </AppToolbar>

    <main class="relative min-h-0 flex-1 outline-none" tabindex="-1" aria-label="Flow canvas">
      <div v-if="status === 'loading'" class="grid size-full place-items-center">
        <NSpin description="Loading flow…" />
      </div>

      <div v-else-if="status === 'error'" class="grid size-full place-items-center">
        <NResult status="error" title="Couldn't load the flow" description="Please try again.">
          <template #footer>
            <NButton
              type="primary"
              :loading="flowQuery.isFetching.value"
              @click="flowQuery.refetch()"
            >
              Retry
            </NButton>
          </template>
        </NResult>
      </div>

      <FlowCanvas
        v-else
        ref="flowCanvas"
        :nodes="graph.nodes"
        :edges="graph.edges"
        :focus-request="focusRequest"
        :right-inset="drawerOpen ? DRAWER_WIDTH : 0"
        @select="onSelect"
        @move="onMove"
        @add="onAdd"
      />
    </main>
  </div>

  <BaseDrawer
    ref="drawer"
    v-model:show="drawerOpen"
    :title="form.title || selectedMeta?.label"
    :icon="selectedMeta?.icon"
    :icon-color="selectedMeta?.color"
    :description="selectedMeta?.label"
  >
    <NForm ref="formRef" :model="form" label-placement="top" @submit.prevent="onSave">
      <NodeBasicsFields v-model:title="form.title" v-model:description="form.description" />

      <SendMessageEditor
        v-if="selectedType === 'sendMessage'"
        v-model:texts="form.texts"
        v-model:attachments="form.attachments"
      />
      <AddCommentEditor v-else-if="selectedType === 'addComment'" v-model:comment="form.comment" />
      <BusinessHoursEditor
        v-else-if="selectedType === 'businessHours'"
        v-model:times="form.times"
        v-model:timezone="form.timezone"
      />
    </NForm>

    <template #footer>
      <div class="flex w-full justify-between">
        <NButton v-if="canDelete" type="error" quaternary @click="editor.openDelete()">
          Delete
        </NButton>
        <span v-else />
        <div class="flex gap-2">
          <NButton @click="closeNode">Cancel</NButton>
          <NButton type="primary" :loading="updateMutation.isPending.value" @click="onSave">
            Save
          </NButton>
        </div>
      </div>
    </template>
  </BaseDrawer>

  <CreateNodeModal
    v-if="createLoaded"
    v-model:show="createOpen"
    v-model:parent-id="createParentId"
    :parent-options="connectTree"
    :loading="createMutation.isPending.value"
    @submit="onCreate"
  />
  <KeyboardShortcutsModal v-if="shortcutsLoaded" v-model:show="shortcutsOpen" />
  <DeleteNodeModal
    v-if="deleteLoaded"
    v-model:show="deleteOpen"
    :node-title="form.title"
    :details="deleteDetails"
    :loading="deleteMutation.isPending.value"
    @confirm="onDelete"
    @closed="onDeleteDialogClosed"
  />
</template>
