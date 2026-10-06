/**
 * Sizes used by the auto-layout. A card is 240px wide; its height is the header and padding
 * plus 20px per description line (clamped to 3), estimated from the text.
 */
export const ACTION_NODE_SIZE = { width: 240, baseHeight: 68, lineHeight: 20, maxLines: 3 }
/** Rough characters per description line at 14px in a 240px card. */
export const DESCRIPTION_CHARS_PER_LINE = 30
export const CONNECTOR_NODE_SIZE = { width: 80, height: 28 }

export const LAYOUT_GAP = { horizontal: 40, vertical: 64 }

/** The trigger's parent id in the payload. */
export const ROOT_PARENT_ID = '-1'

/**
 * Space around the flow when it is fitted to the screen (on first load and with the Fit button),
 * as a fraction of the flow's size. 0.3 leaves the flow slightly zoomed out with room around it.
 */
export const FIT_VIEW_PADDING = 0.3

/** Width of the details drawer; the canvas treats the area under it as hidden. */
export const DRAWER_WIDTH = 440

/** Arrow keys move a focused step by this much (px); with Shift, by the large step. */
export const NUDGE_STEP = 10
export const NUDGE_STEP_LARGE = 50
/** Arrow-key moves of one step this close together (ms) undo as a single move. */
export const NUDGE_MERGE_WINDOW = 1000

/** How long a node stays highlighted after undo/redo changes it (ms). */
export const HIGHLIGHT_DURATION = 1600
