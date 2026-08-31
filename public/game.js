/**
 * Browser entry point that coordinates input, campaign state, persistence,
 * sound, dialogs, and the animated farm world.
 *
 * @module game
 */

import {
	CAMPAIGN_LEVELS,
	GUIDE_SECTIONS,
	STORAGE_KEY,
	countLearned,
	countStars,
	createDefaultProgress,
	createPracticeLevel,
	inputMatches,
	keyLabel,
	normalizeKeyboardEvent,
	readProgress,
	shortcutLabel,
	writeProgress,
} from './game-core.js';
import { FarmWorld } from './farm-world.js';

const elements = {
	canvas: getElement('farm-canvas'),
	trailTrack: getElement('trail-track'),
	trailProgress: getElement('trail-progress'),
	woolScore: getElement('wool-score'),
	calmMeter: getElement('calm-meter'),
	weatherLabel: getElement('weather-label'),
	prefixFlare: getElement('prefix-flare'),
	prefixNextKey: getElement('prefix-next-key'),
	sceneCaption: getElement('scene-caption'),
	chapterNumber: getElement('chapter-number'),
	chapterName: getElement('chapter-name'),
	levelTitle: getElement('level-title'),
	missionStory: getElement('mission-story'),
	missionGoal: getElement('mission-goal'),
	commandName: getElement('command-name'),
	keySequence: getElement('key-sequence'),
	coachNote: getElement('coach-note'),
	stepCount: getElement('step-count'),
	stepDots: getElement('step-dots'),
	prefixButton: getElement('prefix-button'),
	actionKeys: getElement('action-keys'),
	learnedCount: getElement('learned-count'),
	starCount: getElement('star-count'),
	fieldNote: getElement('field-note'),
	mission: getElement('mission'),
	practiceButton: getElement('practice-button'),
	guideButton: getElement('guide-button'),
	soundButton: getElement('sound-button'),
	hintButton: getElement('hint-button'),
	restartLevelButton: getElement('restart-level-button'),
	welcomeDialog: getElement('welcome-dialog'),
	startButton: getElement('start-button'),
	continueButton: getElement('continue-button'),
	completeDialog: getElement('complete-dialog'),
	completeKicker: getElement('complete-kicker'),
	completeTitle: getElement('complete-title'),
	completeCopy: getElement('complete-copy'),
	earnedStars: getElement('earned-stars'),
	learnedShortcut: getElement('learned-shortcut'),
	nextLevelButton: getElement('next-level-button'),
	replayLevelButton: getElement('replay-level-button'),
	guideDialog: getElement('guide-dialog'),
	guideGrid: getElement('guide-grid'),
	guideCloseButton: getElement('guide-close-button'),
	resetProgressButton: getElement('reset-progress-button'),
	toast: getElement('toast'),
	liveRegion: getElement('live-region'),
};

const world = new FarmWorld(elements.canvas);
let sound;
let progress = readProgress(window.localStorage);
let toastTimer = null;
let state = {
	level: CAMPAIGN_LEVELS[0],
	levelIndex: 0,
	stepIndex: 0,
	mistakes: 0,
	streak: 0,
	levelEarned: 0,
	prefixArmed: false,
	locked: false,
	started: false,
	practice: false,
};

function init() {
	world.setCaptionHandler(updateCaption);
	renderGuide();
	bindEvents();
	loadLevel(CAMPAIGN_LEVELS[0], 0, false);

	const hasProgress = Object.keys(progress.completed).length > 0;
	if (hasProgress) {
		elements.continueButton.hidden = false;
		elements.continueButton.textContent = `Continue from pasture ${progress.nextLevel + 1}`;
	}

	window.setTimeout(() => openDialog(elements.welcomeDialog), 180);
}

function bindEvents() {
	document.addEventListener('keydown', handleKeyDown, { capture: true });
	elements.prefixButton.addEventListener('click', armPrefix);
	elements.startButton.addEventListener('click', () => startCampaign(0));
	elements.continueButton.addEventListener('click', () => startCampaign(progress.nextLevel));
	elements.practiceButton.addEventListener('click', startPractice);
	elements.guideButton.addEventListener('click', () => openDialog(elements.guideDialog));
	elements.guideCloseButton.addEventListener('click', () => elements.guideDialog.close());
	elements.soundButton.addEventListener('click', toggleSound);
	elements.hintButton.addEventListener('click', showHint);
	elements.restartLevelButton.addEventListener('click', restartLevel);
	elements.nextLevelButton.addEventListener('click', advanceLevel);
	elements.replayLevelButton.addEventListener('click', restartLevel);
	elements.resetProgressButton.addEventListener('click', resetProgress);

	elements.welcomeDialog.addEventListener('cancel', (event) => {
		if (!state.started) event.preventDefault();
	});
}

function startCampaign(levelIndex) {
	state.started = true;
	closeDialog(elements.welcomeDialog);
	loadLevel(CAMPAIGN_LEVELS[levelIndex], levelIndex, false);
	sound.ensureContext();
}

function startPractice() {
	state.started = true;
	closeDialog(elements.welcomeDialog);
	closeDialog(elements.completeDialog);
	closeDialog(elements.guideDialog);
	const practiceLevel = createPracticeLevel(Date.now(), 10);
	loadLevel(practiceLevel, -1, true);
	showToast('Open range: 10 randomized jobs', 'neutral');
	sound.ensureContext();
}

function loadLevel(level, levelIndex, practice) {
	clearPrefix();
	state = {
		...state,
		level,
		levelIndex,
		stepIndex: 0,
		mistakes: 0,
		streak: 0,
		levelEarned: 0,
		prefixArmed: false,
		locked: false,
		practice,
	};

	world.setLevel(level);
	renderMission();
	renderTrail();
	renderStats();
	setWeather(level.scene);
}

function renderMission() {
	const level = state.level;
	const step = level.steps[Math.min(state.stepIndex, level.steps.length - 1)];
	elements.chapterNumber.textContent = level.practice ? 'OPEN RANGE' : `PASTURE ${level.number}`;
	elements.chapterName.textContent = level.chapter;
	elements.levelTitle.textContent = level.title;
	elements.missionStory.textContent = level.story;
	elements.missionGoal.textContent = level.goal;
	elements.commandName.textContent = step.command.toUpperCase();
	elements.fieldNote.textContent = level.note;
	elements.prefixNextKey.textContent = keyLabel(step.key);
	elements.stepCount.textContent = `${state.stepIndex} / ${level.steps.length}`;

	renderSequence(step);
	renderStepDots();
	renderActionKeys(step);

	if (step.mode === 'prefix') {
		elements.coachNote.textContent = `${step.prompt} Press Ctrl+B, release, then ${keyLabel(step.key)}.`;
		elements.prefixButton.disabled = false;
		elements.prefixButton.classList.toggle('is-armed', state.prefixArmed);
	} else {
		elements.coachNote.textContent = `${step.prompt} You are inside a Herdr mode now, so do not press the prefix again.`;
		elements.prefixButton.disabled = true;
		elements.prefixButton.classList.remove('is-armed');
	}
}

function renderSequence(step) {
	elements.keySequence.replaceChildren();
	if (step.mode === 'prefix') {
		elements.keySequence.append(
			makeKeycap('Ctrl'),
			makeSequenceSymbol('+'),
			makeKeycap('B', state.prefixArmed ? 'done' : ''),
			makeSequenceSymbol('release, then', 'sequence-word'),
			makeKeycap(keyLabel(step.key), state.prefixArmed ? 'current' : ''),
		);
		elements.keySequence.setAttribute('aria-label', shortcutLabel(step));
	} else {
		const directLabel = document.createElement('span');
		directLabel.className = 'direct-label';
		directLabel.textContent = 'NO PREFIX';
		elements.keySequence.append(directLabel, makeKeycap(keyLabel(step.key), 'current'));
		elements.keySequence.setAttribute('aria-label', `Press ${keyLabel(step.key)} directly`);
	}
}

function renderStepDots() {
	elements.stepDots.replaceChildren();
	state.level.steps.forEach((step, index) => {
		const dot = document.createElement('span');
		dot.className = 'step-dot';
		if (index < state.stepIndex) dot.classList.add('is-complete');
		if (index === state.stepIndex) dot.classList.add('is-current');
		dot.title = `${index + 1}. ${step.command}`;
		elements.stepDots.append(dot);
	});
}

function renderActionKeys(step) {
	elements.actionKeys.replaceChildren();
	const controls = [step.key, ...state.level.controls.filter((key) => key !== step.key)];
	for (const key of controls) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'key-button action-key';
		button.dataset.key = key;
		button.textContent = keyLabel(key);
		button.setAttribute('aria-label', `Press ${keyLabel(key)}`);
		if (key === step.key) button.classList.add('expected-key');
		button.addEventListener('click', () => handleVirtualKey(key));
		elements.actionKeys.append(button);
	}
}

function renderTrail() {
	elements.trailTrack.replaceChildren();
	CAMPAIGN_LEVELS.forEach((level, index) => {
		const result = progress.completed[level.id];
		const unlocked = index < progress.unlocked;
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'trail-stop';
		button.disabled = !unlocked;
		button.dataset.index = String(index);
		button.setAttribute('aria-label', `${unlocked ? 'Open' : 'Locked'} pasture ${index + 1}: ${level.title}`);
		button.title = unlocked ? level.title : `Complete pasture ${index} to unlock`;
		if (result) button.classList.add('is-complete');
		if (!state.practice && state.levelIndex === index) button.classList.add('is-current');
		if (!unlocked) button.classList.add('is-locked');
		button.innerHTML = `<span>${result ? '&#10003;' : index + 1}</span>`;
		button.addEventListener('click', () => {
			if (!unlocked || state.locked) return;
			closeDialog(elements.completeDialog);
			loadLevel(level, index, false);
		});
		elements.trailTrack.append(button);
	});

	elements.trailProgress.textContent = state.practice
		? 'Open range practice'
		: `Pasture ${state.levelIndex + 1} of ${CAMPAIGN_LEVELS.length}`;
}

function renderStats() {
	elements.woolScore.textContent = String(progress.wool).padStart(4, '0');
	const calm = Math.max(0, 3 - state.mistakes);
	elements.calmMeter.textContent = `${'♥'.repeat(calm)}${'♡'.repeat(3 - calm)}`;
	elements.calmMeter.setAttribute('aria-label', `${calm} of 3 calm hearts remaining`);
	elements.calmMeter.classList.toggle('is-low', calm <= 1);
	elements.learnedCount.textContent = `${countLearned(progress.completed)} / 24`;
	elements.starCount.textContent = `${countStars(progress.completed)} / 36`;
}

function renderGuide() {
	elements.guideGrid.replaceChildren();
	for (const section of GUIDE_SECTIONS) {
		const card = document.createElement('section');
		card.className = 'guide-section';
		const title = document.createElement('h3');
		title.textContent = section.title;
		const list = document.createElement('dl');
		for (const [action, shortcut] of section.items) {
			const term = document.createElement('dt');
			term.textContent = action;
			const description = document.createElement('dd');
			const key = document.createElement('kbd');
			key.textContent = shortcut;
			description.append(key);
			list.append(term, description);
		}
		card.append(title, list);
		elements.guideGrid.append(card);
	}
}

function handleKeyDown(event) {
	if (!state.started || state.locked || elements.welcomeDialog.open || elements.completeDialog.open || elements.guideDialog.open) return;
	if (event.repeat) return;
	if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')) return;

	const input = normalizeKeyboardEvent(event);
	if (input.mode === 'prefix-trigger') {
		event.preventDefault();
		armPrefix();
		return;
	}

	if (state.prefixArmed) {
		// Once armed, the next key belongs to the prefix sequence rather than the page.
		event.preventDefault();
		handleInput({ mode: 'prefix', key: input.key });
		return;
	}

	const expected = state.level.steps[state.stepIndex];
	if (expected.mode === 'direct') {
		event.preventDefault();
		handleInput({ mode: 'direct', key: input.key });
		return;
	}

	if (input.key.length === 1 || input.key.startsWith('shift+')) {
		event.preventDefault();
		handleWrong('The action key needs the prefix first.');
	}
}

function armPrefix() {
	if (state.locked || state.level.steps[state.stepIndex]?.mode !== 'prefix') {
		showToast('This step uses a direct key: no prefix.', 'neutral');
		return;
	}

	state.prefixArmed = true;
	world.setPrefixArmed(true);
	elements.prefixFlare.classList.add('is-visible');
	elements.prefixButton.classList.add('is-armed');
	renderSequence(state.level.steps[state.stepIndex]);
	elements.liveRegion.textContent = `Prefix ready. Now press ${keyLabel(state.level.steps[state.stepIndex].key)}.`;
	sound.prefix();
}

function clearPrefix() {
	state.prefixArmed = false;
	world.setPrefixArmed(false);
	elements.prefixFlare.classList.remove('is-visible');
	elements.prefixButton.classList.remove('is-armed');
}

function handleVirtualKey(key) {
	if (state.locked) return;
	const step = state.level.steps[state.stepIndex];
	if (step.mode === 'direct') {
		handleInput({ mode: 'direct', key });
		return;
	}
	if (!state.prefixArmed) {
		elements.prefixButton.classList.remove('needs-prefix');
		void elements.prefixButton.offsetWidth;
		elements.prefixButton.classList.add('needs-prefix');
		showToast('Tap Ctrl+B first, then the action key.', 'neutral');
		return;
	}
	handleInput({ mode: 'prefix', key });
}

function handleInput(input) {
	const step = state.level.steps[state.stepIndex];
	clearPrefix();
	if (inputMatches(step, input)) handleCorrect(step);
	else handleWrong(`Expected ${shortcutLabel(step)}.`);
}

function handleCorrect(step) {
	state.locked = true;
	state.streak += 1;
	const points = 70 + Math.min(5, state.streak) * 10;
	state.levelEarned += points;
	progress.wool += points;
	state.stepIndex += 1;
	world.applyAction(step.action);
	sound.correct(state.streak);
	renderStats();
	showToast(`${step.command}  +${points} wool`, 'success');
	elements.liveRegion.textContent = `${step.command} correct. ${state.stepIndex} of ${state.level.steps.length} complete.`;

	window.setTimeout(() => {
		if (state.stepIndex >= state.level.steps.length) {
			completeLevel();
			return;
		}
		state.locked = false;
		renderMission();
	}, 620);
}

function handleWrong(message) {
	clearPrefix();
	state.mistakes += 1;
	state.streak = 0;
	world.mistake();
	sound.wrong();
	renderStats();
	showToast(message, 'error');
	elements.liveRegion.textContent = `Not quite. ${message}`;
	elements.mission.classList.remove('soft-shake');
	void elements.mission.offsetWidth;
	elements.mission.classList.add('soft-shake');
}

function completeLevel() {
	const level = state.level;
	const stars = state.mistakes === 0 ? 3 : state.mistakes <= 2 ? 2 : 1;
	state.locked = true;
	world.completeLevel();
	sound.complete();

	if (!state.practice) {
		// Replays may improve a result, but never erase a player's better score.
		const previous = progress.completed[level.id];
		progress.completed[level.id] = {
			stars: Math.max(stars, previous?.stars ?? 0),
			bestMistakes: Math.min(state.mistakes, previous?.bestMistakes ?? Number.POSITIVE_INFINITY),
		};
		progress.unlocked = Math.max(progress.unlocked, Math.min(CAMPAIGN_LEVELS.length, state.levelIndex + 2));
		progress.nextLevel = Math.min(CAMPAIGN_LEVELS.length - 1, state.levelIndex + 1);
	}
	writeProgress(window.localStorage, progress);
	renderTrail();
	renderStats();

	elements.completeKicker.textContent = state.practice
		? 'PRACTICE RUN COMPLETE'
		: state.levelIndex === CAMPAIGN_LEVELS.length - 1
			? 'TRAIL COMPLETE'
			: 'PASTURE CLEARED';
	elements.completeTitle.textContent = level.reward;
	elements.completeCopy.textContent = `${level.complete} You earned ${state.levelEarned} wool with ${state.mistakes} ${state.mistakes === 1 ? 'wobble' : 'wobbles'}.`;
	elements.earnedStars.textContent = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
	elements.earnedStars.setAttribute('aria-label', `${stars} of 3 stars earned`);
	elements.learnedShortcut.textContent = level.learned.length
		? level.learned.join('  ·  ')
		: state.practice
			? 'Mixed shortcut rhythm'
			: 'Full trail mix';
	elements.nextLevelButton.textContent = state.practice
		? 'Shuffle another mix'
		: state.levelIndex === CAMPAIGN_LEVELS.length - 1
			? 'Open practice range'
			: 'Next pasture';

	window.setTimeout(() => openDialog(elements.completeDialog), 700);
}

function advanceLevel() {
	closeDialog(elements.completeDialog);
	if (state.practice || state.levelIndex === CAMPAIGN_LEVELS.length - 1) {
		startPractice();
		return;
	}
	loadLevel(CAMPAIGN_LEVELS[state.levelIndex + 1], state.levelIndex + 1, false);
}

function restartLevel() {
	closeDialog(elements.completeDialog);
	if (state.practice) {
		startPractice();
		return;
	}
	loadLevel(CAMPAIGN_LEVELS[state.levelIndex], state.levelIndex, false);
}

function showHint() {
	const step = state.level.steps[state.stepIndex];
	if (!step) return;
	elements.coachNote.textContent =
		step.mode === 'prefix'
			? `${step.prompt} Hold Ctrl and tap B. Release both, then tap ${keyLabel(step.key)}.`
			: `${step.prompt} Press ${keyLabel(step.key)} directly; prefix mode is already active.`;
	const expectedButton = elements.actionKeys.querySelector('.expected-key');
	expectedButton?.classList.add('hinted');
	showToast(`Nudge: ${shortcutLabel(step)}`, 'neutral');
}

function resetProgress() {
	if (!window.confirm('Reset every pasture, star, and wool point?')) return;
	window.localStorage.removeItem(STORAGE_KEY);
	progress = createDefaultProgress();
	state.started = true;
	closeDialog(elements.guideDialog);
	loadLevel(CAMPAIGN_LEVELS[0], 0, false);
	showToast('Trail reset. Moss is back at the first gate.', 'neutral');
}

function toggleSound() {
	const enabled = sound.toggle();
	elements.soundButton.setAttribute('aria-pressed', String(enabled));
	elements.soundButton.setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
	elements.soundButton.classList.toggle('is-on', enabled);
	showToast(enabled ? 'Pasture sound on' : 'Pasture sound off', 'neutral');
}

function updateCaption(speaker, copy) {
	const paragraph = elements.sceneCaption.querySelector('p');
	paragraph.replaceChildren();
	const name = document.createElement('strong');
	name.textContent = speaker;
	paragraph.append(name, ` ${copy}`);
}

function setWeather(scene) {
	const labels = {
		night: 'NIGHT / 8 C',
		finale: 'STORM FRONT / 11 C',
		practice: 'OPEN RANGE / 16 C',
		zoom: 'CLEAR / 15 C',
	};
	elements.weatherLabel.textContent = labels[scene] ?? 'MORNING / 14 C';
}

function showToast(message, type) {
	window.clearTimeout(toastTimer);
	elements.toast.textContent = message;
	elements.toast.className = `toast is-visible ${type}`;
	toastTimer = window.setTimeout(() => {
		elements.toast.classList.remove('is-visible');
	}, 2200);
}

function makeKeycap(label, className = '') {
	const keycap = document.createElement('kbd');
	keycap.className = className;
	keycap.textContent = label;
	return keycap;
}

function makeSequenceSymbol(label, className = '') {
	const symbol = document.createElement('span');
	symbol.className = className;
	symbol.textContent = label;
	return symbol;
}

function openDialog(dialog) {
	if (!dialog.open) dialog.showModal();
}

function closeDialog(dialog) {
	if (dialog.open) dialog.close();
}

function getElement(id) {
	const element = document.getElementById(id);
	if (!element) throw new Error(`Missing required element #${id}`);
	return element;
}

class FarmSounds {
	constructor() {
		this.enabled = false;
		this.context = null;
	}

	ensureContext() {
		if (!this.enabled) return;
		this.context ??= new AudioContext();
		if (this.context.state === 'suspended') void this.context.resume();
	}

	toggle() {
		this.enabled = !this.enabled;
		this.ensureContext();
		if (this.enabled) this.tone(420, 0.08, 'sine', 0.035);
		return this.enabled;
	}

	prefix() {
		this.tone(330, 0.055, 'triangle', 0.025);
	}

	correct(streak) {
		this.tone(470 + Math.min(streak, 5) * 38, 0.09, 'sine', 0.035);
		window.setTimeout(() => this.tone(690 + Math.min(streak, 5) * 28, 0.08, 'sine', 0.025), 70);
	}

	wrong() {
		this.tone(145, 0.13, 'triangle', 0.025);
	}

	complete() {
		[392, 523, 659, 784].forEach((frequency, index) => {
			window.setTimeout(() => this.tone(frequency, 0.16, 'sine', 0.03), index * 85);
		});
	}

	tone(frequency, duration, waveform, volume) {
		if (!this.enabled) return;
		this.ensureContext();
		if (!this.context) return;
		const oscillator = this.context.createOscillator();
		const gain = this.context.createGain();
		const now = this.context.currentTime;
		oscillator.type = waveform;
		oscillator.frequency.setValueAtTime(frequency, now);
		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
		oscillator.connect(gain);
		gain.connect(this.context.destination);
		oscillator.start(now);
		oscillator.stop(now + duration + 0.02);
	}
}

sound = new FarmSounds();
init();
