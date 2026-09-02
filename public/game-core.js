/**
 * Campaign content and pure shortcut/progress helpers shared by the browser UI
 * and unit tests.
 *
 * @module game-core
 */

/** The localStorage key used for campaign progress. */
export const STORAGE_KEY = 'herd-herdr-progress-v1';

const prefixed = (key, action, command, prompt) => ({
	mode: 'prefix',
	key,
	action,
	command,
	prompt,
});

const direct = (key, action, command, prompt) => ({
	mode: 'direct',
	key,
	action,
	command,
	prompt,
});

const named = (placeholder, action, command, prompt) => ({
	mode: 'text',
	key: 'name',
	placeholder,
	action,
	command,
	prompt,
});

/** Ordered levels in the guided shortcut campaign. */
export const CAMPAIGN_LEVELS = [
	{
		id: 'fresh-pen',
		number: '01',
		navLabel: 'New tab',
		chapter: 'THE FOLD',
		title: 'A Fresh Pen',
		story:
			'Three lambs arrived before breakfast. Give them a named tab of their own inside the current workspace, without splitting the pane.',
		goal: 'Create and name a Lamb Fold tab for Clover, Dot, and Marzipan.',
		scene: 'build',
		controls: ['c'],
		steps: [
			prefixed('c', 'new-tab-prompt', 'New tab', 'Open the new-tab naming prompt.'),
			named('Lamb Fold', 'create-named-tab', 'Name new tab', 'Choose a useful name for the new tab.'),
		],
		learned: ['prefix+c'],
		reward: 'The lambs are tucked in.',
		complete: 'The new tab has its own pane layout inside the same workspace. No split was added to the original tab.',
		note: 'Herdr asks for a new tab name by default. Each new tab starts with one pane.',
	},
	{
		id: 'split-flock',
		number: '02',
		navLabel: 'Split panes',
		chapter: 'FENCE WORK',
		title: 'Split the Flock',
		story: 'The goats found the sheep feed. Divide the active tab into right and lower panes; the tab itself stays the same.',
		goal: 'Turn one pane into a three-pane layout.',
		scene: 'split',
		controls: ['v', '-', 'c'],
		steps: [
			prefixed('v', 'split-right', 'Split right', 'Run a fence vertically to create a pane on the right.'),
			prefixed('-', 'split-down', 'Split down', 'Run the second fence horizontally to create a pane below.'),
		],
		learned: ['prefix+v', 'prefix+minus'],
		reward: 'Every appetite has a boundary.',
		complete: 'Vertical and horizontal splits let one Herdr tab hold several independent terminals.',
		note: 'Herdr calls prefix+v “split vertical”: the new pane appears to the right.',
	},
	{
		id: 'pane-patrol',
		number: '03',
		navLabel: 'Move focus',
		chapter: 'DOG WORK',
		title: 'Moss on Patrol',
		story: 'A good dog checks every gate. Move focus between the four panes while Moss follows your attention.',
		goal: 'Visit the east, south, west, and north pens in order.',
		scene: 'patrol',
		controls: ['h', 'j', 'k', 'l'],
		steps: [
			prefixed('l', 'focus-right', 'Focus right', 'Send Moss to the pane on the right.'),
			prefixed('j', 'focus-down', 'Focus down', 'Move focus to the pane below.'),
			prefixed('h', 'focus-left', 'Focus left', 'Cross to the pane on the left.'),
			prefixed('k', 'focus-up', 'Focus up', 'Finish the patrol in the pane above.'),
		],
		learned: ['prefix+h', 'prefix+j', 'prefix+k', 'prefix+l'],
		reward: 'Four gates checked. Zero sheep offended.',
		complete: 'Herdr uses Vim directions: h left, j down, k up, and l right.',
		note: 'Think “hjkl” as left, down, up, right. Moss does.',
	},
	{
		id: 'pasture-rotation',
		number: '04',
		navLabel: 'Cycle + rename',
		chapter: 'ROTATION',
		title: 'Pasture Rotation',
		story: 'Cycle through tabs to find fresh grass, back up when you pass it, then give the active tab a useful name.',
		goal: 'Move forward twice, return once, and rename the active tab.',
		scene: 'tabs',
		controls: ['n', 'p', 'shift+t'],
		steps: [
			prefixed('n', 'next-tab', 'Next tab', 'Rotate to the next pasture tab.'),
			prefixed('n', 'next-tab', 'Next tab', 'Keep moving to the clover pasture.'),
			prefixed('p', 'previous-tab', 'Previous tab', 'Step back to the pasture you just passed.'),
			prefixed('shift+t', 'rename-tab-prompt', 'Rename tab', 'Open the active tab rename prompt.'),
			named('Shearing', 'rename-tab', 'Save tab name', 'Replace the generic tab name with something memorable.'),
		],
		learned: ['prefix+n', 'prefix+p', 'prefix+shift+t'],
		reward: 'The grass gets a breather.',
		complete: 'Next and previous cycle through tabs, and rename changes the active tab label without touching its panes.',
		note: 'Use prefix+n and prefix+p for nearby tabs; prefix+Shift+T renames the active tab.',
	},
	{
		id: 'numbered-pens',
		number: '05',
		navLabel: 'Jump to tab',
		chapter: 'EAR TAGS',
		title: 'The Numbered Tabs',
		story: 'Three animals ignored the sorting board. Jump directly to their numbered tabs instead of cycling through every one.',
		goal: 'Check tabs 3, 1, and 2 in that order.',
		scene: 'numbered',
		controls: ['1', '2', '3'],
		steps: [
			prefixed('3', 'jump-3', 'Jump to tab 3', 'Find Thistle in tab 3.'),
			prefixed('1', 'jump-1', 'Jump to tab 1', 'Check Clover in tab 1.'),
			prefixed('2', 'jump-2', 'Jump to tab 2', 'Finish with Button in tab 2.'),
		],
		learned: ['prefix+1..9'],
		reward: 'Every ear tag accounted for.',
		complete: 'Prefix plus 1 through 9 jumps straight to that tab number.',
		note: 'Indexed jumps are faster than cycling when you know the tab number.',
	},
	{
		id: 'lookout-duty',
		number: '06',
		navLabel: 'Zoom pane',
		chapter: 'HIGH GROUND',
		title: 'Lookout Duty',
		story: 'There is a suspicious gap near the north rail. Zoom the focused pane to inspect it, then restore the full farm view.',
		goal: 'Zoom in on the broken rail, then zoom back out.',
		scene: 'zoom',
		controls: ['z', 'r', 'x'],
		steps: [
			prefixed('z', 'zoom-in', 'Zoom pane', 'Make the focused pane fill the view.'),
			prefixed('z', 'zoom-out', 'Restore panes', 'Toggle zoom again to restore the layout.'),
		],
		learned: ['prefix+z'],
		reward: 'Loose rail spotted and mended.',
		complete: 'Zoom is a toggle: the process stays in its pane while the view expands and returns.',
		note: 'A zoomed pane is still part of the same layout; prefix+z brings the others back.',
	},
	{
		id: 'swap-meet',
		number: '07',
		navLabel: 'Swap panes',
		chapter: 'TRADING PLACES',
		title: 'A Fair Exchange',
		story: 'The fleece judging line is backwards. Swap whole panes without interrupting either flock.',
		goal: 'Swap the focused pane right, then put it back left.',
		scene: 'swap',
		controls: ['shift+h', 'shift+j', 'shift+k', 'shift+l'],
		steps: [
			prefixed('shift+l', 'swap-right', 'Swap pane right', 'Trade the focused flock with the pane on its right.'),
			prefixed('shift+h', 'swap-left', 'Swap pane left', 'Swap left to restore the judging order.'),
		],
		learned: ['prefix+shift+h/j/k/l'],
		reward: 'Order restored. Agents uninterrupted.',
		complete: 'Shift plus a Vim direction moves the whole pane; no process is restarted.',
		note: 'Lowercase hjkl moves focus. Shift+HJKL swaps pane positions.',
	},
	{
		id: 'wool-ledger',
		number: '08',
		navLabel: 'Copy mode',
		chapter: 'RECORD KEEPING',
		title: 'The Wool Ledger',
		story: 'The co-op needs three lines from today’s tally. Enter copy mode, start a selection, move down twice, and copy it.',
		goal: 'Copy the highlighted lines from the pane history.',
		scene: 'ledger',
		controls: ['[', 'v', 'j', 'y'],
		steps: [
			prefixed('[', 'copy-mode', 'Enter copy mode', 'Open the focused pane’s scrollback history.'),
			direct('v', 'select-start', 'Start selection', 'Inside copy mode, press v without the prefix.'),
			direct('j', 'select-down', 'Extend selection', 'Move the copy cursor down one line.'),
			direct('j', 'select-down', 'Extend selection', 'Include one more line in the selection.'),
			direct('y', 'copy-selection', 'Copy selection', 'Yank the selected lines to the clipboard.'),
		],
		learned: ['prefix+[', 'v / space to select', 'y / enter to copy'],
		reward: 'The co-op gets a clean tally.',
		complete: 'Copy mode has its own direct keys. The prefix is only needed to enter it.',
		note: 'In copy mode, q or Escape exits without copying; mouse drag-select also works.',
	},
	{
		id: 'across-range',
		number: '09',
		navLabel: 'Spaces',
		chapter: 'THE RANGE',
		title: 'Across the Range',
		story:
			'Create a project workspace, shown as a Space in Herdr’s sidebar. Name it, then use the sidebar and navigation tools to cross the range.',
		goal: 'Create and name Bramble Hill, then explore workspace navigation.',
		scene: 'range',
		controls: ['shift+n', 'shift+w', 'b', 'w', 'arrowdown', 'enter', 'g', 'escape', '?'],
		steps: [
			prefixed('shift+n', 'new-workspace', 'New workspace', 'Create a new project workspace.'),
			prefixed('shift+w', 'rename-workspace-prompt', 'Rename workspace', 'Open the selected workspace rename prompt.'),
			named('Bramble Hill', 'rename-workspace', 'Save workspace name', 'Give the new Space a recognizable project name.'),
			prefixed('b', 'toggle-sidebar', 'Toggle sidebar', 'Collapse the farm-wide sidebar.'),
			prefixed('w', 'workspace-nav', 'Workspace navigation', 'Enter workspace navigation mode.'),
			direct('arrowdown', 'nav-down', 'Navigate down', 'Move the navigator down one workspace with the Down Arrow.'),
			direct('enter', 'nav-confirm', 'Confirm workspace', 'Open the highlighted field.'),
			prefixed('g', 'goto-picker', 'Goto picker', 'Open the searchable goto picker.'),
			direct('escape', 'close-picker', 'Close picker', 'Leave the picker and return to terminal mode.'),
			prefixed('?', 'key-help', 'Keybinding help', 'Open the active binding map whenever you are lost.'),
		],
		learned: ['prefix+shift+n', 'prefix+shift+w', 'prefix+b', 'prefix+w', 'up/down + enter in navigate mode', 'prefix+g', 'prefix+?'],
		reward: 'Bramble named. Button found on North Ridge.',
		complete: 'Spaces are workspace rows in the sidebar; each workspace owns its own tabs, panes, and agents.',
		note: 'New workspaces use a generated name by default. Prefix+Shift+W renames the selected workspace.',
	},
	{
		id: 'closing-time',
		number: '10',
		navLabel: 'Close safely',
		chapter: 'CLOSING TIME',
		title: 'Leave No Gate Open',
		story: 'The temporary quarantine area is empty. Close its pane, tab, and workspace in order, leaving the occupied pens untouched.',
		goal: 'Close the empty pane and tab, then confirm the workspace close.',
		scene: 'close',
		controls: ['x', 'shift+x', 'shift+d', 'enter'],
		steps: [
			prefixed('x', 'close-pane', 'Close pane', 'Remove the empty quarantine pane.'),
			prefixed('shift+x', 'close-tab', 'Close tab', 'Close its now-unused tab.'),
			prefixed('shift+d', 'close-workspace-prompt', 'Close workspace', 'Open the workspace close confirmation.'),
			direct('enter', 'confirm-close-workspace', 'Confirm close', 'Confirm that the temporary workspace should close.'),
		],
		learned: ['prefix+x', 'prefix+shift+x', 'prefix+shift+d'],
		reward: 'Only occupied fields remain.',
		complete: 'Pane, tab, and workspace closes are separate, deliberately different commands.',
		note: 'Herdr asks for confirmation where context makes a close action risky.',
	},
	{
		id: 'night-watch',
		number: '11',
		navLabel: 'Detach',
		chapter: 'AFTER DARK',
		title: 'Night Watch',
		story: 'The gates are latched and the agents are still working. Detach from Herdr and let the whole layout keep running without you.',
		goal: 'Detach while every pane remains alive.',
		scene: 'night',
		controls: ['q', 'x', 'z'],
		steps: [prefixed('q', 'detach', 'Detach', 'Leave the session without stopping the herd.')],
		learned: ['prefix+q'],
		reward: 'The meadow keeps working while you sleep.',
		complete: 'Detach ends the client view, not the terminals. Reattach later and everything is still there.',
		note: 'Prefix+q is the safe way to leave Herdr running in the background.',
	},
	{
		id: 'grand-roundup',
		number: '12',
		navLabel: 'Full roundup',
		chapter: 'THE ROUNDUP',
		title: 'Storm over Bramble Hill',
		story: 'A fast storm is crossing the ridge. Build, split, navigate, inspect, and settle the herd using everything Moss has learned.',
		goal: 'Complete the full roundup without losing your shortcut streak.',
		scene: 'finale',
		controls: ['c', 'v', 'h', 'j', 'k', 'l', 'n', '3', 'z', 'w', 'escape', 'q'],
		steps: [
			prefixed('c', 'new-tab-prompt', 'New storm tab', 'Open a fresh tab for the hill flock.'),
			named('Storm Watch', 'create-named-tab', 'Name storm tab', 'Name the new tab before the storm reaches the ridge.'),
			prefixed('v', 'split-right', 'Split shelter', 'Divide the shelter with a right-hand pane.'),
			prefixed('l', 'focus-right', 'Focus right', 'Move Moss into the new pane.'),
			prefixed('n', 'next-tab', 'Next tab', 'Cycle onward from Storm Watch to the home tab.'),
			prefixed('3', 'jump-3', 'Jump to tab 3', 'Jump directly to the barn tab.'),
			prefixed('z', 'zoom-in', 'Zoom pane', 'Inspect the storm latch up close.'),
			prefixed('b', 'toggle-sidebar', 'Open sidebar', 'Check the full herd at a glance.'),
			prefixed('w', 'workspace-nav', 'Workspace navigation', 'Open the field navigator.'),
			direct('escape', 'nav-cancel', 'Leave navigation', 'Return to terminal mode without changing workspace.'),
			prefixed('q', 'detach', 'Detach', 'Leave the settled herd running through the storm.'),
		],
		learned: [],
		reward: 'Certified Herdr herder.',
		complete: 'You managed the whole range with the same shortcuts Herdr uses in a real terminal.',
		note: 'Speed comes later. Reliable prefix rhythm comes first.',
	},
];

/** Number of distinct shortcut groups introduced by the campaign. */
export const TOTAL_SHORTCUTS = new Set(CAMPAIGN_LEVELS.flatMap((level) => level.learned)).size;

/** Shortcut prompts available to randomized practice sessions. */
export const PRACTICE_POOL = [
	prefixed('h', 'focus-left', 'Focus left', 'Send Moss left.'),
	prefixed('j', 'focus-down', 'Focus down', 'Send Moss down.'),
	prefixed('k', 'focus-up', 'Focus up', 'Send Moss up.'),
	prefixed('l', 'focus-right', 'Focus right', 'Send Moss right.'),
	prefixed('n', 'next-tab', 'Next tab', 'Rotate to the next pasture.'),
	prefixed('p', 'previous-tab', 'Previous tab', 'Return to the previous pasture.'),
	prefixed('1', 'jump-1', 'Jump to tab 1', 'Open tab 1.'),
	prefixed('2', 'jump-2', 'Jump to tab 2', 'Open tab 2.'),
	prefixed('3', 'jump-3', 'Jump to tab 3', 'Open tab 3.'),
	prefixed('z', 'zoom-in', 'Zoom pane', 'Inspect the focused pasture.'),
	prefixed('shift+l', 'swap-right', 'Swap pane right', 'Move the whole pane right.'),
	prefixed('shift+h', 'swap-left', 'Swap pane left', 'Move the whole pane left.'),
	prefixed('b', 'toggle-sidebar', 'Toggle sidebar', 'Show or hide the herd overview.'),
];

/** Reference sections rendered in the in-game field guide. */
export const GUIDE_SECTIONS = [
	{
		title: 'Five to learn first',
		items: [
			['New tab', 'prefix+c'],
			['Split right / down', 'prefix+v / prefix+minus'],
			['Move between panes', 'prefix+h/j/k/l'],
			['Workspace navigation', 'prefix+w'],
			['Detach safely', 'prefix+q'],
		],
	},
	{
		title: 'Panes',
		items: [
			['Zoom focused pane', 'prefix+z'],
			['Close pane', 'prefix+x'],
			['Swap panes', 'prefix+shift+h/j/k/l'],
			['Resize mode', 'prefix+r'],
			['Copy mode', 'prefix+['],
		],
	},
	{
		title: 'Tabs',
		items: [
			['Next / previous', 'prefix+n / prefix+p'],
			['Jump to tab 1–9', 'prefix+1..9'],
			['Rename tab', 'prefix+shift+t'],
			['Close tab', 'prefix+shift+x'],
		],
	},
	{
		title: 'Spaces, workspaces, and session',
		items: [
			['New workspace', 'prefix+shift+n'],
			['Rename workspace', 'prefix+shift+w'],
			['Close workspace', 'prefix+shift+d'],
			['Goto picker', 'prefix+g'],
			['Toggle sidebar', 'prefix+b'],
			['Show active bindings', 'prefix+?'],
		],
	},
];

/**
 * Convert a normalized key identifier into its display label.
 *
 * @param {string} key - Normalized key identifier used by campaign steps.
 * @returns {string} Human-readable key label.
 */
export function keyLabel(key) {
	const labels = {
		'-': '−',
		'[': '[',
		']': ']',
		'?': '?',
		enter: 'Enter',
		escape: 'Esc',
		space: 'Space',
		arrowdown: '↓',
		arrowup: '↑',
		name: 'Name',
		'shift+h': 'Shift+H',
		'shift+j': 'Shift+J',
		'shift+k': 'Shift+K',
		'shift+l': 'Shift+L',
		'shift+x': 'Shift+X',
		'shift+d': 'Shift+D',
		'shift+n': 'Shift+N',
		'shift+t': 'Shift+T',
		'shift+w': 'Shift+W',
	};

	return labels[key] ?? key.toUpperCase();
}

/**
 * Format a campaign step as a complete shortcut instruction.
 *
 * @param {{mode: string, key: string}} step - Shortcut step to describe.
 * @returns {string} Display-ready shortcut sequence.
 */
export function shortcutLabel(step) {
	if (step.mode === 'text') return 'Type a name, then press Enter';
	if (step.mode === 'direct') return keyLabel(step.key);
	return `Ctrl+B, then ${keyLabel(step.key)}`;
}

/**
 * Normalize a browser keyboard event into the game's input vocabulary.
 *
 * @param {{key: string, ctrlKey?: boolean, altKey?: boolean, metaKey?: boolean, shiftKey?: boolean}} event - Keyboard-like event.
 * @returns {{mode: string, key: string}} Normalized game input.
 */
export function normalizeKeyboardEvent(event) {
	const rawKey = event.key;
	const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey.toLowerCase();

	if (event.ctrlKey && !event.altKey && !event.metaKey && key === 'b') {
		return { mode: 'prefix-trigger', key: 'ctrl+b' };
	}

	if (rawKey === 'Enter') return { mode: 'direct', key: 'enter' };
	if (rawKey === 'Escape') return { mode: 'direct', key: 'escape' };
	if (rawKey === ' ') return { mode: 'direct', key: 'space' };
	if (event.shiftKey && /^[a-z]$/i.test(rawKey)) {
		return { mode: 'direct', key: `shift+${rawKey.toLowerCase()}` };
	}

	return { mode: 'direct', key };
}

/**
 * Determine whether normalized input satisfies the current campaign step.
 *
 * @param {{mode: string, key: string}} step - Expected shortcut step.
 * @param {{mode: string, key: string}} input - Normalized player input.
 * @returns {boolean} Whether mode and key both match.
 */
export function inputMatches(step, input) {
	return step.mode === input.mode && step.key === input.key;
}

/**
 * Create a fresh campaign progress record.
 *
 * @returns {{unlocked: number, nextLevel: number, wool: number, completed: object}} Default progress state.
 */
export function createDefaultProgress() {
	return {
		unlocked: 1,
		nextLevel: 0,
		wool: 0,
		completed: {},
	};
}

/**
 * Read and validate campaign progress from a Storage-compatible object.
 *
 * @param {{getItem: (key: string) => string | null}} storage - Persistence adapter, normally localStorage.
 * @returns {{unlocked: number, nextLevel: number, wool: number, completed: object}} Sanitized progress state.
 */
export function readProgress(storage) {
	const fallback = createDefaultProgress();

	try {
		const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
		if (!parsed || typeof parsed !== 'object') return fallback;
		const completed = parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {};
		let nextLevel = clampInteger(parsed.nextLevel, 0, CAMPAIGN_LEVELS.length - 1, 0);
		if (completed[CAMPAIGN_LEVELS[nextLevel].id]) nextLevel = findNextLessonIndex(completed, nextLevel);

		return {
			unlocked: clampInteger(parsed.unlocked, 1, CAMPAIGN_LEVELS.length, 1),
			nextLevel,
			wool: clampInteger(parsed.wool, 0, 999999, 0),
			completed,
		};
	} catch {
		return fallback;
	}
}

/**
 * Persist campaign progress to a Storage-compatible object.
 *
 * @param {{setItem: (key: string, value: string) => void}} storage - Persistence adapter, normally localStorage.
 * @param {object} progress - Current campaign progress.
 * @returns {void}
 */
export function writeProgress(storage, progress) {
	storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/**
 * Count unique shortcuts introduced by completed campaign levels.
 *
 * @param {Record<string, object>} completed - Completion results keyed by level ID.
 * @returns {number} Number of unique learned shortcut groups.
 */
export function countLearned(completed) {
	const learned = new Set();

	for (const level of CAMPAIGN_LEVELS) {
		if (!completed[level.id]) continue;
		for (const shortcut of level.learned) learned.add(shortcut);
	}

	return learned.size;
}

/**
 * Sum earned stars while guarding against malformed persisted values.
 *
 * @param {Record<string, {stars?: number}>} completed - Completion results keyed by level ID.
 * @returns {number} Total stars earned.
 */
export function countStars(completed) {
	return Object.values(completed).reduce((total, result) => total + clampInteger(result?.stars, 0, 3, 0), 0);
}

/** Return whether every campaign lesson has a persisted result. */
export function isCampaignComplete(completed) {
	return CAMPAIGN_LEVELS.every((level) => completed[level.id]);
}

/** Find the next incomplete lesson, wrapping once after the current lesson. */
export function findNextLessonIndex(completed, currentIndex = -1) {
	const laterIncomplete = CAMPAIGN_LEVELS.findIndex((level, index) => index > currentIndex && !completed[level.id]);
	if (laterIncomplete >= 0) return laterIncomplete;
	const firstIncomplete = CAMPAIGN_LEVELS.findIndex((level) => !completed[level.id]);
	return firstIncomplete >= 0 ? firstIncomplete : CAMPAIGN_LEVELS.length - 1;
}

/**
 * Build a reproducible mixed-practice level from the shortcut pool.
 *
 * @param {number} [seed=Date.now()] - Seed for deterministic prompt selection.
 * @param {number} [length=10] - Number of prompts to include.
 * @returns {object} Campaign-compatible practice level.
 */
export function createPracticeLevel(seed = Date.now(), length = 10) {
	const random = seededRandom(seed);
	const steps = [];
	let previousKey = '';

	while (steps.length < length) {
		const candidate = PRACTICE_POOL[Math.floor(random() * PRACTICE_POOL.length)];
		// Consecutive duplicates feel like a missed input rather than a new prompt.
		if (candidate.key === previousKey) continue;
		steps.push({ ...candidate });
		previousKey = candidate.key;
	}

	return {
		id: 'practice-mix',
		number: '∞',
		chapter: 'OPEN RANGE',
		title: 'Mixed Herd Practice',
		story: 'No script, no storm, just a lively herd and a randomized run through the shortcuts you use most.',
		goal: `Complete ${length} mixed jobs and build a clean streak.`,
		scene: 'practice',
		controls: [...new Set(steps.map((step) => step.key))],
		steps,
		learned: [],
		reward: 'A sharper, calmer shortcut rhythm.',
		complete: 'Every clean repetition makes the prefix sequence more automatic.',
		note: 'Try the mix again: every run selects a different sequence.',
		practice: true,
	};
}

function clampInteger(value, min, max, fallback) {
	if (!Number.isInteger(value)) return fallback;
	return Math.min(max, Math.max(min, value));
}

function seededRandom(seed) {
	let state = Number(seed) >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
}
