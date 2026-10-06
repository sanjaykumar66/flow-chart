import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/vue'
import { mount } from '@vue/test-utils'
import { NTimePicker } from 'naive-ui'
import BusinessHoursEditor from '@/components/editors/BusinessHoursEditor.vue'
import { DEFAULT_OPENING_HOURS, WEEK_DAYS } from '@/constants/forms'
import type { BusinessHoursSlot } from '@/types/flow'
import { renderInForm } from '../../helpers/renderInForm'

const nineToFive = (): BusinessHoursSlot[] =>
  WEEK_DAYS.map(({ value }) => ({ day: value, startTime: '09:00', endTime: '17:00' }))

const setup = (times = nineToFive(), timezone = 'UTC') =>
  renderInForm(BusinessHoursEditor, { times, timezone })

describe('BusinessHoursEditor', () => {
  it('shows a row for every day of the week', () => {
    setup()
    for (const { label } of WEEK_DAYS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('shows each day’s opening and closing times in labelled pickers', () => {
    setup()
    expect(screen.getByLabelText('Mon opening time')).toHaveValue('09:00')
    expect(screen.getByLabelText('Mon closing time')).toHaveValue('17:00')
    expect(screen.getByLabelText('Sun closing time')).toHaveValue('17:00')
  })

  it('shows the selected timezone with its offset', () => {
    setup(nineToFive(), 'UTC')
    expect(screen.getByText('(GMT+00:00) UTC')).toBeInTheDocument()
  })

  it('marks days without hours as closed', () => {
    setup(nineToFive().filter((slot) => slot.day !== 'sun'))
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.queryByLabelText('Sun opening time')).not.toBeInTheDocument()
  })

  it('passes validation for valid hours', async () => {
    const { validate } = setup()
    await expect(validate()).resolves.toEqual([])
  })

  it('rejects a day whose closing time is not after its opening time', async () => {
    const times = nineToFive().map((slot) =>
      slot.day === 'mon' ? { ...slot, startTime: '18:00' } : slot,
    )
    const { validate } = setup(times)
    await expect(validate()).resolves.toEqual(['Closing time must be after opening time'])
  })

  it('requires a timezone', async () => {
    const { validate } = setup(nineToFive(), '')
    await expect(validate()).resolves.toEqual(['Select a timezone'])
  })

  it('updates only the edited day when a time is picked', async () => {
    const onUpdateTimes = vi.fn()
    const wrapper = mount(BusinessHoursEditor, {
      props: { times: nineToFive(), timezone: 'UTC', 'onUpdate:times': onUpdateTimes },
    })

    // Driving the picker's dropdown needs real layout, so emit its value change directly.
    const [mondayOpening, mondayClosing] = wrapper.findAllComponents(NTimePicker)
    mondayOpening!.vm.$emit('update:formatted-value', '10:30')
    mondayClosing!.vm.$emit('update:formatted-value', '18:00')

    const [afterOpening] = onUpdateTimes.mock.calls[0] as [BusinessHoursSlot[]]
    expect(afterOpening[0]).toEqual({ day: 'mon', startTime: '10:30', endTime: '17:00' })
    expect(afterOpening.slice(1)).toEqual(nineToFive().slice(1))

    const [afterClosing] = onUpdateTimes.mock.calls[1] as [BusinessHoursSlot[]]
    expect(afterClosing[0]).toEqual({ day: 'mon', startTime: '09:00', endTime: '18:00' })
    wrapper.unmount()
  })

  describe('opening and closing days', () => {
    const switchFor = (day: string) => screen.getByRole('switch', { name: `${day} open` })

    it('has a named switch per day showing whether it is open', () => {
      setup(nineToFive().filter((slot) => slot.day !== 'sun'))
      expect(switchFor('Mon')).toHaveAttribute('aria-checked', 'true')
      expect(switchFor('Sun')).toHaveAttribute('aria-checked', 'false')
    })

    it('closes an open day', async () => {
      const { model } = setup()
      await fireEvent.click(switchFor('Wed'))
      expect(model.times.map((slot) => slot.day)).toEqual([
        'mon',
        'tue',
        'thu',
        'fri',
        'sat',
        'sun',
      ])
      expect(await screen.findByText('Closed')).toBeInTheDocument()
    })

    it('opens a closed day with the default hours, in week order', async () => {
      const { model } = setup(nineToFive().filter((slot) => slot.day !== 'wed'))
      await fireEvent.click(switchFor('Wed'))
      expect(model.times.map((slot) => slot.day)).toEqual(WEEK_DAYS.map(({ value }) => value))
      expect(model.times[2]).toEqual({ day: 'wed', ...DEFAULT_OPENING_HOURS })
      expect(await screen.findByLabelText('Wed opening time')).toHaveValue('09:00')
    })

    it('can close every day', async () => {
      const { model, validate } = setup([{ day: 'mon', startTime: '09:00', endTime: '17:00' }])
      await fireEvent.click(switchFor('Mon'))
      expect(model.times).toEqual([])
      await expect(validate()).resolves.toEqual([])
    })
  })
})
