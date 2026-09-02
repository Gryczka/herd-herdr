import { describe, expect, it } from 'vitest';
import {
	CAMPAIGN_LEVELS,
	PRACTICE_POOL,
	TOTAL_SHORTCUTS,
	countLearned,
	countStars,
	createPracticeLevel,
	findNextLessonIndex,
	inputMatches,
	isCampaignComplete,
	normalizeKeyboardEvent,
	readProgress,
} from '../public/game-core.js';

describe('Herd Herdr campaign', () => {
	it('contains a complete 12-pasture trail with valid steps', () => {
		expect(CAMPAIGN_LEVELS).toHaveLength(12);
		expect(new Set(CAMPAIGN_LEVELS.map((level) => level.id)).size).toBe(12);

		for (const level of CAMPAIGN_LEVELS) {
			expect(level.navLabel).toBeTruthy();
			expect(level.steps.length).toBeGreaterThan(0);
			for (const step of level.steps) {
				expect(['prefix', 'direct', 'text']).toContain(step.mode);
				expect(step.key).toBeTruthy();
				expect(step.action).toBeTruthy();
				if (step.mode === 'text') expect(step.placeholder).toBeTruthy();
			}
		}
	});

	it('teaches every advertised shortcut before the finale', () => {
		const completed = Object.fromEntries(CAMPAIGN_LEVELS.map((level) => [level.id, { stars: 3 }]));
		expect(TOTAL_SHORTCUTS).toBe(27);
		expect(countLearned(completed)).toBe(TOTAL_SHORTCUTS);
		expect(countStars(completed)).toBe(36);
	});

	it('includes real tab and workspace naming flows', () => {
		const actions = CAMPAIGN_LEVELS.flatMap((level) => level.steps.map((step) => step.action));
		expect(actions).toContain('new-tab-prompt');
		expect(actions).toContain('rename-tab-prompt');
		expect(actions).toContain('new-workspace');
		expect(actions).toContain('rename-workspace-prompt');
	});

	it('exits persistent pickers before accepting another prefix command', () => {
		const rangeActions = CAMPAIGN_LEVELS.find((level) => level.id === 'across-range').steps.map((step) => [step.mode, step.action]);
		const finaleActions = CAMPAIGN_LEVELS.find((level) => level.id === 'grand-roundup').steps.map((step) => [step.mode, step.action]);
		const gotoIndex = rangeActions.findIndex(([, action]) => action === 'goto-picker');
		const navigationIndex = finaleActions.findIndex(([, action]) => action === 'workspace-nav');

		expect(rangeActions.slice(gotoIndex, gotoIndex + 3)).toEqual([
			['prefix', 'goto-picker'],
			['direct', 'close-picker'],
			['prefix', 'key-help'],
		]);
		expect(finaleActions.slice(navigationIndex, navigationIndex + 3)).toEqual([
			['prefix', 'workspace-nav'],
			['direct', 'nav-cancel'],
			['prefix', 'detach'],
		]);
	});

	it('keeps stateful and terminating actions out of mixed practice', () => {
		const actions = PRACTICE_POOL.map((step) => step.action);
		for (const action of ['new-tab', 'workspace-nav', 'goto-picker', 'key-help', 'detach']) expect(actions).not.toContain(action);
	});
});

describe('keyboard input', () => {
	it('recognizes the default prefix independently from action keys', () => {
		expect(normalizeKeyboardEvent({ key: 'b', ctrlKey: true, altKey: false, metaKey: false, shiftKey: false })).toEqual({
			mode: 'prefix-trigger',
			key: 'ctrl+b',
		});
		expect(normalizeKeyboardEvent({ key: 'L', ctrlKey: false, altKey: false, metaKey: false, shiftKey: true })).toEqual({
			mode: 'direct',
			key: 'shift+l',
		});
		expect(normalizeKeyboardEvent({ key: 'Enter', ctrlKey: false, altKey: false, metaKey: false, shiftKey: false })).toEqual({
			mode: 'direct',
			key: 'enter',
		});
		expect(normalizeKeyboardEvent({ key: 'ArrowDown', ctrlKey: false, altKey: false, metaKey: false, shiftKey: false })).toEqual({
			mode: 'direct',
			key: 'arrowdown',
		});
	});

	it('requires both input mode and key to match', () => {
		const step = { mode: 'prefix', key: 'c' };
		expect(inputMatches(step, { mode: 'prefix', key: 'c' })).toBe(true);
		expect(inputMatches(step, { mode: 'direct', key: 'c' })).toBe(false);
		expect(inputMatches(step, { mode: 'prefix', key: 'v' })).toBe(false);
	});
});

describe('practice and progress', () => {
	it('builds a deterministic mix without immediate repeats', () => {
		const first = createPracticeLevel(42, 14);
		const second = createPracticeLevel(42, 14);
		expect(first.steps).toEqual(second.steps);
		expect(first.steps).toHaveLength(14);
		for (let index = 1; index < first.steps.length; index += 1) {
			expect(first.steps[index].key).not.toBe(first.steps[index - 1].key);
		}
	});

	it('falls back safely when stored progress is malformed', () => {
		const brokenStorage = { getItem: () => '{broken json' };
		expect(readProgress(brokenStorage)).toEqual({
			unlocked: 1,
			nextLevel: 0,
			wool: 0,
			completed: {},
		});
	});

	it('normalizes stale resume progress to an open lesson', () => {
		const storage = {
			getItem: () =>
				JSON.stringify({
					unlocked: 2,
					nextLevel: 0,
					wool: 100,
					completed: { 'fresh-pen': { stars: 3, bestMistakes: 0 } },
				}),
		};

		expect(readProgress(storage).nextLevel).toBe(1);
	});

	it('chooses the next open lesson regardless of completion order', () => {
		const completed = Object.fromEntries(CAMPAIGN_LEVELS.map((level) => [level.id, { stars: 3 }]));
		delete completed[CAMPAIGN_LEVELS[4].id];

		expect(isCampaignComplete(completed)).toBe(false);
		expect(findNextLessonIndex(completed, 10)).toBe(4);
		completed[CAMPAIGN_LEVELS[4].id] = { stars: 3 };
		expect(isCampaignComplete(completed)).toBe(true);
		expect(findNextLessonIndex(completed, 4)).toBe(CAMPAIGN_LEVELS.length - 1);
	});
});
