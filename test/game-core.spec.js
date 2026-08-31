import { describe, expect, it } from 'vitest';
import {
	CAMPAIGN_LEVELS,
	countLearned,
	countStars,
	createPracticeLevel,
	inputMatches,
	normalizeKeyboardEvent,
	readProgress,
} from '../public/game-core.js';

describe('Herd Herdr campaign', () => {
	it('contains a complete 12-pasture trail with valid steps', () => {
		expect(CAMPAIGN_LEVELS).toHaveLength(12);
		expect(new Set(CAMPAIGN_LEVELS.map((level) => level.id)).size).toBe(12);

		for (const level of CAMPAIGN_LEVELS) {
			expect(level.steps.length).toBeGreaterThan(0);
			for (const step of level.steps) {
				expect(['prefix', 'direct']).toContain(step.mode);
				expect(step.key).toBeTruthy();
				expect(step.action).toBeTruthy();
			}
		}
	});

	it('teaches 24 distinct shortcuts before the finale', () => {
		const completed = Object.fromEntries(CAMPAIGN_LEVELS.map((level) => [level.id, { stars: 3 }]));
		expect(countLearned(completed)).toBe(24);
		expect(countStars(completed)).toBe(36);
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
});
