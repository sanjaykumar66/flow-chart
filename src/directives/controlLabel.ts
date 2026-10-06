import type { Directive } from 'vue'

/**
 * Names the focusable part of a Naive select (its search input, or the focusable box when it
 * isn't filterable). NFormItem labels aren't tied to that element, so screen readers would
 * otherwise announce an unnamed control. Usage: `<NSelect v-control-label="'Type of Node'" />`.
 */
function apply(el: HTMLElement, label: string) {
  // A filterable select focuses its box first and its search input once opened: name both.
  el.querySelectorAll('input, [tabindex="0"]').forEach((control) =>
    control.setAttribute('aria-label', label),
  )
}

export const vControlLabel: Directive<HTMLElement, string> = {
  mounted: (el, { value }) => apply(el, value),
  updated: (el, { value }) => apply(el, value),
}
