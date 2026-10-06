<script setup lang="ts">
import { computed, useId } from 'vue'
import { NFormItem, NSelect, NTimePicker, type FormItemRule } from 'naive-ui'
import { CalendarDaysIcon, ClockIcon } from '@heroicons/vue/24/outline'
import { WEEK_DAYS } from '@/constants/forms'
import type { BusinessHoursSlot, WeekDay } from '@/types/flow'
import { getTimeRangeError } from '@/utils/time'
import { getTimezoneOptions } from '@/utils/timezone'

/**
 * Business Hours fields: opening/closing time per weekday and a timezone.
 * Use inside an NForm whose model has `times` and `timezone`.
 */
const times = defineModel<BusinessHoursSlot[]>('times', { required: true })
const timezone = defineModel<string>('timezone', { required: true })

const timezoneOptions = getTimezoneOptions()
const timezoneId = useId()

const rows = computed(() =>
  WEEK_DAYS.map(({ value, label }) => {
    const index = times.value.findIndex((slot) => slot.day === value)
    return { day: value, label, index, slot: times.value[index] }
  }),
)

const rangeRule: FormItemRule = {
  trigger: 'change',
  validator: (_rule, slot?: BusinessHoursSlot) => {
    if (!slot) return true
    const error = getTimeRangeError(slot.startTime, slot.endTime)
    return error ? new Error(error) : true
  },
}

const timezoneRule: FormItemRule = {
  required: true,
  message: 'Select a timezone',
  trigger: ['change', 'blur'],
}

function updateSlot(day: WeekDay, key: 'startTime' | 'endTime', value: string | null) {
  times.value = times.value.map((slot) =>
    slot.day === day ? { ...slot, [key]: value ?? '' } : slot,
  )
}
</script>

<template>
  <div class="mb-2 grid grid-cols-[3rem_1fr] gap-3 text-xs text-zinc-500" aria-hidden="true">
    <span class="flex items-center gap-1.5"><CalendarDaysIcon class="size-4" /> Day</span>
    <span class="flex items-center gap-1.5"><ClockIcon class="size-4" /> Time</span>
  </div>

  <NFormItem
    v-for="row in rows"
    :key="row.day"
    :path="row.index >= 0 ? `times[${row.index}]` : undefined"
    :rule="rangeRule"
    :show-label="false"
    :show-require-mark="false"
  >
    <div class="grid w-full grid-cols-[3rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
      <span class="text-sm font-semibold text-zinc-900">{{ row.label }}</span>
      <template v-if="row.slot">
        <!-- NTimePicker has no input-props, so a wrapping label names the input -->
        <label class="block min-w-0">
          <span class="sr-only">{{ row.label }} opening time</span>
          <NTimePicker
            :formatted-value="row.slot.startTime"
            value-format="HH:mm"
            format="HH:mm"
            :clearable="false"
            :actions="['confirm']"
            @update:formatted-value="updateSlot(row.day, 'startTime', $event)"
          />
        </label>
        <span class="text-xs text-zinc-500">to</span>
        <!-- NTimePicker has no input-props, so a wrapping label names the input -->
        <label class="block min-w-0">
          <span class="sr-only">{{ row.label }} closing time</span>
          <NTimePicker
            :formatted-value="row.slot.endTime"
            value-format="HH:mm"
            format="HH:mm"
            :clearable="false"
            :actions="['confirm']"
            @update:formatted-value="updateSlot(row.day, 'endTime', $event)"
          />
        </label>
      </template>
      <span v-else class="col-span-3 text-sm text-zinc-500">Closed</span>
    </div>
  </NFormItem>

  <NFormItem
    label="Time Zone"
    path="timezone"
    :rule="timezoneRule"
    :label-props="{ for: timezoneId }"
  >
    <NSelect
      v-model:value="timezone"
      :input-props="{ id: timezoneId }"
      :options="timezoneOptions"
      filterable
      placeholder="Select a timezone"
    />
  </NFormItem>
</template>
