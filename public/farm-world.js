/**
 * Canvas-based farm simulation that turns shortcut actions into animated scene
 * changes while retaining a text equivalent for assistive technology.
 *
 * @module farm-world
 */

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 600;
const TAU = Math.PI * 2;

const COLORS = {
	ink: '#17251f',
	cream: '#fff6d8',
	grass: '#759f45',
	grassDark: '#426936',
	wheat: '#d6ad58',
	wood: '#8b5937',
	woodLight: '#c4874e',
	coral: '#ed765c',
	sky: '#9ed4d3',
};

/**
 * Render and animate the campaign's farm scenes on a single canvas.
 */
export class FarmWorld {
	/**
	 * @param {HTMLCanvasElement} canvas - Responsive canvas owned by the game UI.
	 */
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.level = null;
		this.animals = [];
		this.particles = [];
		this.flowers = createFlowers(58, 92831);
		this.clouds = createClouds();
		this.lastTime = performance.now();
		this.hoveredAnimal = null;
		this.prefixArmed = false;
		this.shake = 0;
		this.captionHandler = null;
		this.state = this.createSceneState();
		this.dog = { x: 420, y: 410, tx: 420, ty: 410, phase: 0, happy: 0 };

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(canvas);
		this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
		this.canvas.addEventListener('pointerleave', () => {
			this.hoveredAnimal = null;
			this.canvas.style.cursor = 'default';
		});

		this.resize();
		requestAnimationFrame((time) => this.frame(time));
	}

	createSceneState() {
		return {
			newTab: 0,
			newTabTarget: 0,
			verticalFence: 0,
			verticalFenceTarget: 0,
			horizontalFence: 0,
			horizontalFenceTarget: 0,
			activePasture: 0,
			activePen: 0,
			zoom: 1,
			zoomTarget: 1,
			ledger: 0,
			ledgerTarget: 0,
			selection: 0,
			selectionTarget: 0,
			map: 0,
			mapTarget: 0,
			mapSelection: 0,
			activeWorkspace: 0,
			workspaceNames: ['HOME FOLD', 'NORTH RIDGE'],
			tabNames: ['AGENTS'],
			prompt: 0,
			promptTarget: 0,
			promptKind: 'name',
			promptTitle: '',
			promptValue: '',
			help: 0,
			helpTarget: 0,
			closed: 0,
			closedTarget: 0,
			night: 0,
			nightTarget: 0,
			storm: 0,
			stormTarget: 0,
			flash: 0,
		};
	}

	/**
	 * Register the callback used to mirror scene dialogue in accessible HTML.
	 *
	 * @param {(speaker: string, copy: string) => void} handler - Caption callback.
	 * @returns {void}
	 */
	setCaptionHandler(handler) {
		this.captionHandler = handler;
	}

	/**
	 * Reset the world for a campaign-compatible level.
	 *
	 * @param {{scene: string}} level - Level whose scene selects the farm layout.
	 * @returns {void}
	 */
	setLevel(level) {
		this.level = level;
		this.state = this.createSceneState();
		this.particles = [];
		this.hoveredAnimal = null;
		this.dog = { x: 420, y: 410, tx: 420, ty: 410, phase: 0, happy: 0 };

		if (['patrol', 'practice'].includes(level.scene)) {
			this.state.verticalFence = 1;
			this.state.verticalFenceTarget = 1;
			this.state.horizontalFence = 1;
			this.state.horizontalFenceTarget = 1;
		}
		if (['swap', 'zoom', 'close'].includes(level.scene)) {
			this.state.verticalFence = 1;
			this.state.verticalFenceTarget = 1;
		}
		if (level.scene === 'patrol') {
			this.dog = { x: 300, y: 330, tx: 300, ty: 330, phase: 0, happy: 0 };
		}
		if (level.scene === 'zoom') {
			this.dog = { x: 700, y: 390, tx: 700, ty: 390, phase: 0, happy: 0 };
		}
		const sceneTabs = {
			tabs: ['AGENTS', 'LOGS', 'CLOVER'],
			numbered: ['SHEEP', 'GOATS', 'RIDGE'],
			practice: ['AGENTS', 'LOGS', 'SHELL'],
			finale: ['HOME', 'RIDGE', 'BARN'],
			close: ['AGENTS', 'EMPTY'],
		};
		this.state.tabNames = [...(sceneTabs[level.scene] ?? ['AGENTS'])];
		if (level.scene === 'close') {
			this.state.workspaceNames = ['HOME FOLD', 'QUARANTINE'];
			this.state.activeWorkspace = 1;
			this.state.activePasture = 1;
		}
		if (level.scene === 'night') {
			this.state.night = 0.18;
			this.state.nightTarget = 0.18;
		}
		if (level.scene === 'finale') {
			this.state.storm = 0.35;
			this.state.stormTarget = 0.35;
		}

		this.animals = createAnimals(level.scene);
		this.canvas.setAttribute('aria-label', sceneDescription(level.scene));
		this.emitCaption('MOSS', captionForScene(level.scene));
	}

	/**
	 * Reflect whether the keyboard prefix is waiting for an action key.
	 *
	 * @param {boolean} armed - Whether prefix mode is active.
	 * @returns {void}
	 */
	setPrefixArmed(armed) {
		this.prefixArmed = armed;
		if (armed) this.dog.happy = 1;
	}

	/** Mirror the browser naming field in the canvas prompt. */
	setPromptValue(value) {
		this.state.promptValue = value;
	}

	/**
	 * Translate a completed shortcut action into scene state and dialogue.
	 *
	 * @param {string} action - Action identifier from the current campaign step.
	 * @param {string} [value] - Optional name entered for a tab or workspace.
	 * @returns {void}
	 */
	applyAction(action, value = '') {
		this.state.flash = 1;
		this.dog.happy = 1;

		switch (action) {
			case 'new-tab-prompt':
				this.openPrompt('NEW TAB', 'name');
				this.emitCaption('MOSS', 'Herdr asks for a tab name before creating it.');
				break;
			case 'create-named-tab':
				this.state.tabNames.push(displayName(value, 'NEW TAB'));
				this.state.activePasture = this.state.tabNames.length - 1;
				this.state.newTabTarget = 1;
				this.state.promptTarget = 0;
				this.moveAnimals(
					(animal) => animal.type === 'sheep',
					[
						[670, 355],
						[755, 420],
						[820, 340],
						[710, 470],
					],
				);
				this.emitCaption('CLOVER', `${displayName(value, 'New tab')} is ours. No pane was split.`);
				break;
			case 'new-tab':
				this.state.tabNames.push('SCRATCH');
				this.state.activePasture = this.state.tabNames.length - 1;
				this.state.newTab = 1;
				this.state.newTabTarget = 1;
				this.emitCaption('MOSS', 'A new scratch tab joined this workspace.');
				break;
			case 'split-right':
				this.state.verticalFenceTarget = 1;
				this.moveAnimals(
					(animal) => animal.type === 'goat',
					[
						[650, 340],
						[790, 430],
					],
				);
				this.emitCaption('MOSS', 'Right-hand pane coming up. Goats to starboard.');
				break;
			case 'split-down':
				this.state.horizontalFenceTarget = 1;
				this.moveAnimals(
					(animal) => animal.type === 'sheep',
					[
						[260, 320],
						[395, 330],
						[275, 465],
						[650, 470],
					],
				);
				this.emitCaption('BUTTON', 'A dedicated lower pane? I accept.');
				break;
			case 'focus-left':
				this.moveDog(-1, 0);
				break;
			case 'focus-right':
				this.moveDog(1, 0);
				break;
			case 'focus-up':
				this.moveDog(0, -1);
				break;
			case 'focus-down':
				this.moveDog(0, 1);
				break;
			case 'next-tab':
				this.state.activePasture = (this.state.activePasture + 1) % this.state.tabNames.length;
				this.rotatePasture();
				this.emitCaption('MOSS', `Pasture tab ${this.state.activePasture + 1}. Fresh tracks here.`);
				break;
			case 'previous-tab':
				this.state.activePasture = (this.state.activePasture - 1 + this.state.tabNames.length) % this.state.tabNames.length;
				this.rotatePasture();
				this.emitCaption('MOSS', `Back to pasture tab ${this.state.activePasture + 1}.`);
				break;
			case 'jump-1':
			case 'jump-2':
			case 'jump-3': {
				const pen = Number(action.slice(-1)) - 1;
				this.state.activePen = pen;
				this.state.activePasture = pen;
				this.dog.tx = [275, 500, 725][pen];
				this.dog.ty = 430;
				this.bouncePen(pen);
				this.emitCaption('MOSS', `Straight to tab ${pen + 1}. No cycling required.`);
				break;
			}
			case 'rename-tab-prompt':
				this.openPrompt('RENAME TAB', 'name', this.state.tabNames[this.state.activePasture]);
				this.emitCaption('MOSS', 'The active tab name is ready to edit.');
				break;
			case 'rename-tab':
				this.state.tabNames[this.state.activePasture] = displayName(value, 'TAB');
				this.state.promptTarget = 0;
				this.emitCaption('MOSS', `Active tab renamed ${displayName(value, 'Tab')}.`);
				break;
			case 'zoom-in':
				this.state.zoomTarget = 1.38;
				this.emitCaption('MOSS', 'That rail pin is nearly out. Good catch.');
				break;
			case 'zoom-out':
				this.state.zoomTarget = 1;
				this.emitCaption('MOSS', 'Whole layout restored. Every pen is still here.');
				break;
			case 'swap-right':
			case 'swap-left':
				this.swapHerds();
				this.emitCaption('MARZIPAN', 'The whole pane moved, but my breakfast did not spill.');
				break;
			case 'copy-mode':
				this.state.ledgerTarget = 1;
				this.emitCaption('LEDGER', 'COPY MODE — move, select, and copy with direct keys.');
				break;
			case 'select-start':
				this.state.selectionTarget = 0.28;
				this.emitCaption('LEDGER', 'Selection started. Extend it down the tally.');
				break;
			case 'select-down':
				this.state.selectionTarget = Math.min(1, this.state.selectionTarget + 0.32);
				break;
			case 'copy-selection':
				this.state.selectionTarget = 1;
				this.burst(700, 330, 22, 'paper');
				this.emitCaption('LEDGER', 'Three lines copied. The co-op will be delighted.');
				break;
			case 'new-workspace':
				this.state.workspaceNames.splice(1, 0, 'WORKSPACE 2');
				this.state.activeWorkspace = 1;
				this.state.mapSelection = 1;
				this.emitCaption('MOSS', 'New workspace created with a generated name. It joined the Spaces list.');
				break;
			case 'rename-workspace-prompt':
				this.openPrompt('RENAME WORKSPACE', 'name', this.state.workspaceNames[this.state.activeWorkspace]);
				this.emitCaption('MOSS', 'The selected workspace name is ready to edit.');
				break;
			case 'rename-workspace':
				this.state.workspaceNames[this.state.activeWorkspace] = displayName(value, 'WORKSPACE');
				this.state.promptTarget = 0;
				this.emitCaption('MOSS', `${displayName(value, 'Workspace')} now has its own Space row.`);
				break;
			case 'toggle-sidebar':
				this.state.mapTarget = this.state.mapTarget > 0.5 ? 0 : 1;
				this.emitCaption(
					'MOSS',
					this.state.mapTarget ? 'The sidebar sees every Space and agent.' : 'Sidebar collapsed. The workspace is still active.',
				);
				break;
			case 'workspace-nav':
				this.state.mapTarget = 1;
				this.state.mapSelection = this.state.activeWorkspace;
				this.emitCaption('MOSS', 'Navigate mode ready. Up and Down move between workspaces.');
				break;
			case 'nav-down':
				this.state.mapSelection = Math.min(this.state.workspaceNames.length - 1, this.state.mapSelection + 1);
				break;
			case 'nav-confirm':
				this.state.activeWorkspace = this.state.mapSelection;
				this.state.mapTarget = 0;
				this.emitCaption('BUTTON', `${this.state.workspaceNames[this.state.activeWorkspace]} opened. Entirely intentional.`);
				break;
			case 'goto-picker':
				this.state.mapTarget = 1;
				this.state.mapSelection = this.state.activeWorkspace;
				this.emitCaption('MOSS', 'Goto searches workspaces, tabs, panes, and agents.');
				break;
			case 'close-picker':
			case 'nav-cancel':
				this.state.mapTarget = 0;
				this.emitCaption('MOSS', 'Back in terminal mode.');
				break;
			case 'key-help':
				this.state.helpTarget = 1;
				this.emitCaption('MOSS', 'When memory wanders, prefix+? brings it home.');
				window.setTimeout(() => {
					this.state.helpTarget = 0;
				}, 1300);
				break;
			case 'close-pane':
				this.state.closedTarget = 1;
				this.emitCaption('MOSS', 'Empty pane closed. Occupied pens untouched.');
				break;
			case 'close-tab':
				this.state.closedTarget = 2;
				this.state.activePasture = 0;
				this.emitCaption('MOSS', 'Temporary tab closed.');
				break;
			case 'close-workspace-prompt':
				this.openPrompt('CLOSE WORKSPACE?', 'confirm', this.state.workspaceNames[this.state.activeWorkspace]);
				this.emitCaption('MOSS', 'Herdr confirms before closing a workspace by default.');
				break;
			case 'confirm-close-workspace':
				this.state.promptTarget = 0;
				this.state.closedTarget = 3;
				this.state.activeWorkspace = 0;
				this.emitCaption('MOSS', 'Quarantine workspace packed away.');
				break;
			case 'detach':
				this.state.nightTarget = 1;
				this.state.stormTarget = 0;
				for (const animal of this.animals) animal.sleeping = true;
				this.emitCaption('MOSS', 'Client detached. Herd and agents still running.');
				break;
			default:
				break;
		}

		this.celebrate();
	}

	openPrompt(title, kind, value = '') {
		this.state.promptTitle = title;
		this.state.promptKind = kind;
		this.state.promptValue = value;
		this.state.promptTarget = 1;
	}

	/** Trigger restrained visual feedback for an incorrect shortcut. */
	mistake() {
		this.shake = this.reducedMotion ? 0 : 1;
		for (const animal of this.animals) {
			animal.startled = 1;
			animal.tx += (Math.random() - 0.5) * 18;
			animal.ty += (Math.random() - 0.5) * 12;
		}
		this.emitCaption('MOSS', 'Easy now. Prefix first, action second.');
	}

	celebrate() {
		this.burst(this.dog.tx, this.dog.ty - 30, 14, 'wool');
	}

	/** Trigger the scene celebration shown after a completed level. */
	completeLevel() {
		this.burst(500, 320, 50, 'wool');
		this.dog.happy = 2;
	}

	moveDog(dx, dy) {
		const cellsX = [300, 700];
		const cellsY = [330, 470];
		const currentX = this.dog.tx < 500 ? 0 : 1;
		const currentY = this.dog.ty < 400 ? 0 : 1;
		const nextX = Math.max(0, Math.min(1, currentX + dx));
		const nextY = Math.max(0, Math.min(1, currentY + dy));
		this.dog.tx = cellsX[nextX];
		this.dog.ty = cellsY[nextY];
		this.emitCaption('MOSS', `${dx < 0 ? 'Left' : dx > 0 ? 'Right' : dy < 0 ? 'Up' : 'Down'} pane focused.`);
	}

	moveAnimals(predicate, positions) {
		let index = 0;
		for (const animal of this.animals) {
			if (!predicate(animal)) continue;
			const position = positions[index % positions.length];
			animal.tx = position[0];
			animal.ty = position[1];
			index += 1;
		}
	}

	rotatePasture() {
		const offsets = [0, 38, -28];
		const vertical = [0, -22, 18];
		const index = this.state.activePasture % offsets.length;
		for (const animal of this.animals) {
			animal.tx = clamp(animal.homeX + offsets[index], 170, 835);
			animal.ty = clamp(animal.homeY + vertical[index], 285, 500);
		}
	}

	bouncePen(pen) {
		const ranges = [
			[150, 370],
			[390, 610],
			[630, 850],
		];
		for (const animal of this.animals) {
			animal.highlight = animal.x >= ranges[pen][0] && animal.x <= ranges[pen][1] ? 1 : 0;
		}
	}

	swapHerds() {
		for (const animal of this.animals) {
			animal.tx = 1000 - animal.tx;
			animal.homeX = animal.tx;
		}
		this.dog.tx = 1000 - this.dog.tx;
	}

	burst(x, y, count, kind) {
		if (this.reducedMotion) count = Math.min(count, 8);
		for (let index = 0; index < count; index += 1) {
			const angle = Math.random() * TAU;
			const speed = 35 + Math.random() * 90;
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 40,
				life: 0.7 + Math.random() * 0.65,
				maxLife: 1.35,
				rotation: Math.random() * TAU,
				kind,
			});
		}
	}

	emitCaption(speaker, copy) {
		if (this.captionHandler) this.captionHandler(speaker, copy);
	}

	handlePointerMove(event) {
		const rect = this.canvas.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH;
		const y = ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT;
		this.hoveredAnimal = this.animals.find((animal) => Math.hypot(animal.x - x, animal.y - y) < 42) ?? null;
		this.canvas.style.cursor = this.hoveredAnimal ? 'help' : 'default';
	}

	resize() {
		const rect = this.canvas.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const width = Math.max(1, Math.round(rect.width * dpr));
		const height = Math.max(1, Math.round(rect.height * dpr));
		if (this.canvas.width !== width || this.canvas.height !== height) {
			this.canvas.width = width;
			this.canvas.height = height;
		}
	}

	frame(time) {
		const delta = Math.min(0.04, (time - this.lastTime) / 1000);
		this.lastTime = time;
		this.update(delta, time / 1000);
		this.draw(time / 1000);
		requestAnimationFrame((nextTime) => this.frame(nextTime));
	}

	update(delta, elapsed) {
		const speed = this.reducedMotion ? 12 : 4.8;
		const ease = Math.min(1, delta * speed);
		// Every scene property eases toward a target so actions can interrupt cleanly.
		const animatedKeys = [
			'newTab',
			'verticalFence',
			'horizontalFence',
			'zoom',
			'ledger',
			'selection',
			'map',
			'prompt',
			'help',
			'closed',
			'night',
			'storm',
		];
		for (const key of animatedKeys) {
			this.state[key] += (this.state[`${key}Target`] - this.state[key]) * ease;
		}
		this.state.flash = Math.max(0, this.state.flash - delta * 2.8);
		this.shake = Math.max(0, this.shake - delta * 4.5);
		this.dog.happy = Math.max(0, this.dog.happy - delta * 0.7);
		this.dog.x += (this.dog.tx - this.dog.x) * Math.min(1, delta * 5);
		this.dog.y += (this.dog.ty - this.dog.y) * Math.min(1, delta * 5);
		this.dog.phase = elapsed;

		for (const animal of this.animals) {
			animal.x += (animal.tx - animal.x) * Math.min(1, delta * (2.4 + animal.speed));
			animal.y += (animal.ty - animal.y) * Math.min(1, delta * (2.4 + animal.speed));
			animal.phase += delta * (1.3 + animal.speed * 0.2);
			animal.highlight = Math.max(0, animal.highlight - delta * 0.55);
			animal.startled = Math.max(0, animal.startled - delta * 1.6);
		}

		for (const particle of this.particles) {
			particle.life -= delta;
			particle.x += particle.vx * delta;
			particle.y += particle.vy * delta;
			particle.vy += 105 * delta;
			particle.rotation += delta * 2;
		}
		this.particles = this.particles.filter((particle) => particle.life > 0);
	}

	draw(elapsed) {
		const ctx = this.ctx;
		ctx.setTransform(this.canvas.width / WORLD_WIDTH, 0, 0, this.canvas.height / WORLD_HEIGHT, 0, 0);
		ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

		const shakeX = this.shake > 0 ? Math.sin(elapsed * 55) * 5 * this.shake : 0;
		const shakeY = this.shake > 0 ? Math.cos(elapsed * 47) * 2 * this.shake : 0;
		ctx.save();
		ctx.translate(shakeX, shakeY);
		this.drawSky(ctx, elapsed);

		const zoom = this.state.zoom;
		ctx.translate(710, 345);
		ctx.scale(zoom, zoom);
		ctx.translate(-710, -345);
		this.drawGround(ctx, elapsed);
		this.drawPenHighlights(ctx);
		this.drawFenceLayout(ctx);
		this.drawProps(ctx, elapsed);
		this.drawAnimals(ctx, elapsed);
		this.drawDog(ctx, elapsed);
		this.drawFrontFence(ctx);
		this.drawParticles(ctx);
		ctx.restore();

		this.drawHierarchy(ctx);
		this.drawWeather(ctx, elapsed);
		this.drawLedger(ctx);
		this.drawMap(ctx);
		this.drawHelp(ctx);
		this.drawPrompt(ctx);
		this.drawFlash(ctx);
	}

	drawSky(ctx, elapsed) {
		const night = this.state.night;
		const skyTop = mixColor('#79c7cf', '#172b42', night);
		const skyBottom = mixColor('#d9e8b1', '#665f72', night);
		const gradient = ctx.createLinearGradient(0, 0, 0, 240);
		gradient.addColorStop(0, skyTop);
		gradient.addColorStop(1, skyBottom);
		ctx.fillStyle = gradient;
		ctx.fillRect(-10, -10, WORLD_WIDTH + 20, 270);

		const sunX = 820 - night * 630;
		const sunY = 72 + night * 25;
		ctx.save();
		ctx.globalAlpha = 1 - night * 0.35;
		ctx.fillStyle = mixColor('#ffe68b', '#e8edf5', night);
		ctx.shadowColor = mixColor('#ffe68b', '#c9d7ff', night);
		ctx.shadowBlur = 28;
		ctx.beginPath();
		ctx.arc(sunX, sunY, 31, 0, TAU);
		ctx.fill();
		ctx.restore();

		if (night > 0.2) {
			ctx.fillStyle = '#f7f2d0';
			for (let index = 0; index < 34; index += 1) {
				const x = ((index * 83 + 37) % 960) + 20;
				const y = ((index * 47 + 13) % 120) + 12;
				ctx.globalAlpha = night * (0.45 + Math.sin(elapsed * 2 + index) * 0.18);
				ctx.fillRect(x, y, 2, 2);
			}
			ctx.globalAlpha = 1;
		}

		this.drawHills(ctx, night);
		for (const cloud of this.clouds) this.drawCloud(ctx, cloud, elapsed, night);
	}

	drawHills(ctx, night) {
		ctx.fillStyle = mixColor('#547f57', '#263f47', night);
		ctx.beginPath();
		ctx.moveTo(0, 176);
		ctx.bezierCurveTo(120, 94, 250, 113, 360, 170);
		ctx.bezierCurveTo(505, 77, 695, 91, 820, 169);
		ctx.bezierCurveTo(910, 119, 980, 125, 1020, 155);
		ctx.lineTo(1020, 265);
		ctx.lineTo(0, 265);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = mixColor('#789c58', '#31504a', night);
		ctx.beginPath();
		ctx.moveTo(0, 205);
		ctx.bezierCurveTo(142, 135, 260, 160, 397, 220);
		ctx.bezierCurveTo(560, 142, 728, 147, 1020, 215);
		ctx.lineTo(1020, 275);
		ctx.lineTo(0, 275);
		ctx.closePath();
		ctx.fill();
	}

	drawCloud(ctx, cloud, elapsed, night) {
		const x = ((cloud.x + elapsed * cloud.speed) % 1160) - 100;
		ctx.save();
		ctx.translate(x, cloud.y);
		ctx.scale(cloud.scale, cloud.scale);
		ctx.globalAlpha = 0.68 - this.state.storm * 0.32;
		ctx.fillStyle = mixColor('#fffbe5', '#4f5867', Math.max(night, this.state.storm));
		ctx.beginPath();
		ctx.arc(0, 8, 18, 0, TAU);
		ctx.arc(23, 0, 26, 0, TAU);
		ctx.arc(53, 10, 19, 0, TAU);
		ctx.rect(-2, 8, 58, 19);
		ctx.fill();
		ctx.restore();
	}

	drawGround(ctx, elapsed) {
		const night = this.state.night;
		const grassGradient = ctx.createLinearGradient(0, 190, 0, 600);
		grassGradient.addColorStop(0, mixColor('#89ac50', '#334f43', night));
		grassGradient.addColorStop(1, mixColor('#4f813e', '#1d3934', night));
		ctx.fillStyle = grassGradient;
		ctx.fillRect(-20, 190, 1040, 430);

		ctx.save();
		ctx.globalAlpha = 0.28 - night * 0.12;
		ctx.strokeStyle = mixColor('#f5dc80', '#829c80', night);
		ctx.lineWidth = 1.5;
		for (const flower of this.flowers) {
			const sway = this.reducedMotion ? 0 : Math.sin(elapsed * 1.7 + flower.phase) * 2;
			ctx.beginPath();
			ctx.moveTo(flower.x, flower.y + 8);
			ctx.quadraticCurveTo(flower.x + sway, flower.y + 3, flower.x + sway, flower.y);
			ctx.stroke();
			ctx.fillStyle = flower.color;
			ctx.beginPath();
			ctx.arc(flower.x + sway, flower.y, flower.size, 0, TAU);
			ctx.fill();
		}
		ctx.restore();

		ctx.strokeStyle = mixColor('#d7b56e', '#786b58', night);
		ctx.lineWidth = 46;
		ctx.lineCap = 'round';
		ctx.globalAlpha = 0.62;
		ctx.beginPath();
		ctx.moveTo(-20, 575);
		ctx.bezierCurveTo(180, 530, 210, 590, 412, 552);
		ctx.bezierCurveTo(635, 510, 780, 570, 1030, 500);
		ctx.stroke();
		ctx.globalAlpha = 1;

		this.drawBarn(ctx, 55, 164, night);
		this.drawTree(ctx, 906, 190, 1.05, night);
		this.drawTree(ctx, 78, 335, 0.72, night);
		this.drawTree(ctx, 925, 428, 0.62, night);
	}

	drawBarn(ctx, x, y, night) {
		ctx.save();
		ctx.translate(x, y);
		ctx.fillStyle = 'rgba(21, 34, 28, 0.2)';
		ctx.beginPath();
		ctx.ellipse(80, 102, 85, 20, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = mixColor('#b94e3c', '#5b4242', night);
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.rect(18, 37, 118, 68);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = mixColor('#803a31', '#3c3136', night);
		ctx.beginPath();
		ctx.moveTo(4, 42);
		ctx.lineTo(77, -4);
		ctx.lineTo(151, 42);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#f3dec0';
		ctx.fillRect(57, 61, 42, 44);
		ctx.strokeRect(57, 61, 42, 44);
		ctx.strokeStyle = '#b94e3c';
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(59, 63);
		ctx.lineTo(97, 103);
		ctx.moveTo(97, 63);
		ctx.lineTo(59, 103);
		ctx.stroke();
		ctx.restore();
	}

	drawTree(ctx, x, y, scale, night) {
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(scale, scale);
		ctx.fillStyle = 'rgba(21, 34, 28, 0.18)';
		ctx.beginPath();
		ctx.ellipse(0, 74, 47, 13, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = mixColor('#765136', '#4a403c', night);
		ctx.fillRect(-9, 29, 18, 49);
		ctx.fillStyle = mixColor('#315b3d', '#203d3b', night);
		for (const [dx, dy, radius] of [
			[-23, 22, 31],
			[13, 8, 35],
			[36, 31, 26],
			[-1, -14, 31],
		]) {
			ctx.beginPath();
			ctx.arc(dx, dy, radius, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	drawHierarchy(ctx) {
		const scene = this.level?.scene;
		if (!scene) return;

		const x = 120;
		const y = 197;
		const width = 760;
		const workspaceWidth = 218;
		ctx.save();
		ctx.fillStyle = 'rgba(14, 29, 24, 0.25)';
		roundedRect(ctx, x + 5, y + 6, width, 51, 12);
		ctx.fill();
		ctx.fillStyle = '#1d312a';
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = 3;
		roundedRect(ctx, x, y, width, 51, 12);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#9fc16e';
		ctx.font = '800 8px ui-monospace, monospace';
		ctx.textAlign = 'left';
		ctx.fillText('SPACE · WORKSPACE', x + 14, y + 16);
		ctx.fillStyle = COLORS.cream;
		ctx.font = '800 13px ui-monospace, monospace';
		const workspace = this.state.workspaceNames[this.state.activeWorkspace] ?? 'HOME FOLD';
		ctx.fillText(workspace.slice(0, 21), x + 14, y + 37);

		ctx.strokeStyle = '#65806e';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x + workspaceWidth, y + 8);
		ctx.lineTo(x + workspaceWidth, y + 43);
		ctx.stroke();

		const tabs = this.state.tabNames;
		const gap = 6;
		const tabsX = x + workspaceWidth + 10;
		const available = width - workspaceWidth - 20;
		const tabWidth = Math.min(128, (available - gap * Math.max(0, tabs.length - 1)) / Math.max(1, tabs.length));
		for (let index = 0; index < tabs.length; index += 1) {
			let alpha = 1;
			if (['build', 'finale'].includes(scene) && index === tabs.length - 1 && tabs.length > (scene === 'finale' ? 3 : 1)) {
				alpha = this.state.newTab;
			}
			if (scene === 'close' && index === 1) alpha *= 1 - clamp(this.state.closed - 1, 0, 1);
			if (alpha < 0.01) continue;

			const tabX = tabsX + index * (tabWidth + gap);
			const active = index === this.state.activePasture;
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.translate(0, (1 - alpha) * 8);
			ctx.fillStyle = active ? '#f1d268' : '#f6edcf';
			ctx.strokeStyle = active ? COLORS.coral : '#0d1915';
			ctx.lineWidth = active ? 3 : 2;
			roundedRect(ctx, tabX, y + 9, tabWidth, 33, 7);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = COLORS.ink;
			ctx.font = '800 10px ui-monospace, monospace';
			ctx.textAlign = 'left';
			ctx.fillText(`${index + 1}  ${tabs[index].slice(0, 11)}`, tabX + 9, y + 30);
			ctx.restore();
		}

		ctx.fillStyle = 'rgba(23, 37, 31, 0.72)';
		ctx.font = '800 8px ui-monospace, monospace';
		ctx.textAlign = 'right';
		ctx.fillText('ACTIVE TAB · PANE LAYOUT BELOW', 878, 267);
		ctx.restore();
	}

	drawPenHighlights(ctx) {
		const scene = this.level?.scene;
		if (scene === 'numbered') {
			const colors = ['rgba(255,228,126,.18)', 'rgba(108,189,165,.2)', 'rgba(227,133,116,.16)'];
			ctx.fillStyle = colors[this.state.activePen];
			roundedRect(ctx, 120, 248, 760, 280, 24);
			ctx.fill();
		}
		if (scene === 'tabs') {
			const colors = ['rgba(255,228,126,.18)', 'rgba(108,189,165,.2)', 'rgba(227,133,116,.16)'];
			ctx.fillStyle = colors[this.state.activePasture];
			roundedRect(ctx, 120, 248, 760, 280, 24);
			ctx.fill();
		}
	}

	drawFenceLayout(ctx) {
		const scene = this.level?.scene;
		if (!scene) return;

		if (scene === 'close') {
			this.drawFenceRect(ctx, 120, 248, 760, 280, 1);
			const paneAlpha = Math.max(0, 1 - this.state.closed);
			ctx.save();
			ctx.globalAlpha = paneAlpha;
			this.drawFenceLine(ctx, 500, 248, 500, 528, 1);
			ctx.restore();
			return;
		}

		this.drawFenceRect(ctx, 120, 248, 760, 280, 1);

		if (['split', 'patrol', 'swap', 'finale', 'practice', 'zoom'].includes(scene)) {
			this.drawFenceLine(ctx, 500, 248, 500, 528, this.state.verticalFence);
		}
		if (scene === 'split') {
			this.drawFenceLine(ctx, 500, 390, 880, 390, this.state.horizontalFence);
		}
		if (['patrol', 'practice'].includes(scene)) {
			this.drawFenceLine(ctx, 120, 390, 880, 390, this.state.horizontalFence);
		}

		if (scene === 'zoom') {
			ctx.save();
			ctx.strokeStyle = '#ef7258';
			ctx.lineWidth = 5;
			ctx.setLineDash([7, 6]);
			ctx.beginPath();
			ctx.arc(748, 285, 38, 0, TAU);
			ctx.stroke();
			ctx.restore();
		}
	}

	drawFenceRect(ctx, x, y, width, height, progress) {
		this.drawFenceLine(ctx, x, y, x + width, y, progress);
		this.drawFenceLine(ctx, x, y, x, y + height, progress);
		this.drawFenceLine(ctx, x + width, y, x + width, y + height, progress);
		this.drawFenceLine(ctx, x, y + height, x + width, y + height, progress);
	}

	drawFenceLine(ctx, x1, y1, x2, y2, progress = 1) {
		if (progress < 0.01) return;
		const endX = x1 + (x2 - x1) * easeOut(progress);
		const endY = y1 + (y2 - y1) * easeOut(progress);
		const length = Math.hypot(endX - x1, endY - y1);
		const angle = Math.atan2(endY - y1, endX - x1);
		const posts = Math.max(1, Math.floor(length / 54));

		ctx.save();
		ctx.translate(x1, y1);
		ctx.rotate(angle);
		ctx.lineCap = 'round';
		ctx.strokeStyle = '#5f3d29';
		ctx.lineWidth = 9;
		for (const railY of [-7, 10]) {
			ctx.beginPath();
			ctx.moveTo(0, railY + 4);
			ctx.lineTo(length, railY + 4);
			ctx.stroke();
			ctx.strokeStyle = COLORS.woodLight;
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.moveTo(0, railY);
			ctx.lineTo(length, railY);
			ctx.stroke();
			ctx.strokeStyle = '#5f3d29';
			ctx.lineWidth = 9;
		}

		for (let index = 0; index <= posts; index += 1) {
			const x = (length / posts) * index;
			ctx.fillStyle = '#5f3d29';
			roundedRect(ctx, x - 6, -22, 14, 47, 4);
			ctx.fill();
			ctx.fillStyle = COLORS.woodLight;
			roundedRect(ctx, x - 5, -25, 10, 45, 3);
			ctx.fill();
		}
		ctx.restore();
	}

	drawSign(ctx, x, y, label, number, alpha = 1, active = false) {
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.translate(x, y);
		ctx.fillStyle = 'rgba(23, 37, 31, 0.22)';
		roundedRect(ctx, -52, 7, 108, 30, 7);
		ctx.fill();
		ctx.fillStyle = active ? '#f5d36d' : '#f3e2b2';
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = active ? 4 : 3;
		roundedRect(ctx, -55, -12, 110, 34, 7);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = COLORS.ink;
		ctx.font = '700 12px ui-monospace, monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(label, 0, 5);
		if (number) {
			ctx.fillStyle = active ? COLORS.coral : COLORS.ink;
			ctx.beginPath();
			ctx.arc(47, -10, 12, 0, TAU);
			ctx.fill();
			ctx.fillStyle = COLORS.cream;
			ctx.font = '800 11px ui-monospace, monospace';
			ctx.fillText(String(number), 47, -9);
		}
		ctx.restore();
	}

	drawProps(ctx, elapsed) {
		if (this.level?.scene === 'zoom') {
			ctx.save();
			ctx.translate(746, 285);
			ctx.rotate(-0.18);
			ctx.fillStyle = '#e9d6a0';
			ctx.strokeStyle = COLORS.ink;
			ctx.lineWidth = 3;
			roundedRect(ctx, -8, -34, 16, 58, 4);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = COLORS.coral;
			ctx.beginPath();
			ctx.arc(9, -26, 6 + Math.sin(elapsed * 4), 0, TAU);
			ctx.fill();
			ctx.restore();
		}

		if (this.level?.scene === 'ledger') {
			this.drawCrate(ctx, 650, 440);
		}
	}

	drawCrate(ctx, x, y) {
		ctx.save();
		ctx.translate(x, y);
		ctx.fillStyle = '#7a4e32';
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = 4;
		ctx.fillRect(-42, -29, 84, 58);
		ctx.strokeRect(-42, -29, 84, 58);
		ctx.strokeStyle = '#c3884e';
		ctx.lineWidth = 7;
		ctx.beginPath();
		ctx.moveTo(-36, -24);
		ctx.lineTo(36, 24);
		ctx.moveTo(36, -24);
		ctx.lineTo(-36, 24);
		ctx.stroke();
		ctx.restore();
	}

	drawAnimals(ctx, elapsed) {
		const sorted = [...this.animals].sort((a, b) => a.y - b.y);
		for (const animal of sorted) {
			const hovered = animal === this.hoveredAnimal;
			const bob = this.reducedMotion || animal.sleeping ? 0 : Math.sin(animal.phase * 2.2) * 2.2;
			ctx.save();
			ctx.translate(animal.x, animal.y + bob);
			if (animal.highlight > 0 || hovered) {
				ctx.strokeStyle = hovered ? '#fff6d8' : `rgba(255, 224, 105, ${animal.highlight})`;
				ctx.lineWidth = 4;
				ctx.beginPath();
				ctx.ellipse(0, 3, 43 + Math.sin(elapsed * 4) * 2, 30, 0, 0, TAU);
				ctx.stroke();
			}

			if (animal.type === 'goat') this.drawGoat(ctx, animal);
			else if (animal.type === 'alpaca') this.drawAlpaca(ctx, animal);
			else this.drawSheep(ctx, animal);

			if (hovered) this.drawNameTag(ctx, animal.name, animal.role);
			ctx.restore();
		}
	}

	drawSheep(ctx, animal) {
		ctx.fillStyle = 'rgba(19, 35, 28, 0.22)';
		ctx.beginPath();
		ctx.ellipse(0, 21, 34, 10, 0, 0, TAU);
		ctx.fill();
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = 4;
		ctx.lineCap = 'round';
		if (!animal.sleeping) {
			ctx.beginPath();
			ctx.moveTo(-18, 13);
			ctx.lineTo(-20, 30);
			ctx.moveTo(16, 13);
			ctx.lineTo(17, 30);
			ctx.stroke();
		}

		const wool = animal.color;
		ctx.fillStyle = wool;
		for (const [x, y, radius] of [
			[-20, -3, 18],
			[-7, -13, 20],
			[10, -13, 21],
			[25, -2, 18],
			[18, 12, 18],
			[-3, 12, 22],
			[-23, 10, 16],
		]) {
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, TAU);
			ctx.fill();
		}
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.ellipse(0, 1, 43, 31, 0, 0, TAU);
		ctx.stroke();

		ctx.fillStyle = animal.face;
		ctx.beginPath();
		ctx.ellipse(30, 4, 15, 20, -0.22, 0, TAU);
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(28, -9);
		ctx.lineTo(17, -17 - animal.startled * 4);
		ctx.lineTo(30, -14);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = COLORS.cream;
		ctx.beginPath();
		ctx.arc(34, -1, 3.3, 0, TAU);
		ctx.fill();
		ctx.fillStyle = COLORS.ink;
		ctx.beginPath();
		ctx.arc(35, -1, 1.5, 0, TAU);
		ctx.fill();
		if (animal.sleeping) {
			ctx.strokeStyle = COLORS.cream;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(31, -2);
			ctx.quadraticCurveTo(35, 1, 39, -2);
			ctx.stroke();
		}
	}

	drawGoat(ctx, animal) {
		ctx.fillStyle = 'rgba(19, 35, 28, 0.22)';
		ctx.beginPath();
		ctx.ellipse(0, 22, 35, 9, 0, 0, TAU);
		ctx.fill();
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = 4;
		if (!animal.sleeping) {
			ctx.beginPath();
			ctx.moveTo(-20, 12);
			ctx.lineTo(-22, 31);
			ctx.moveTo(16, 12);
			ctx.lineTo(18, 31);
			ctx.stroke();
		}
		ctx.fillStyle = animal.color;
		ctx.beginPath();
		ctx.ellipse(-2, 1, 37, 25, -0.04, 0, TAU);
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.ellipse(28, -6, 16, 21, -0.32, 0, TAU);
		ctx.fill();
		ctx.stroke();
		ctx.strokeStyle = '#e9d49a';
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(24, -24);
		ctx.quadraticCurveTo(17, -39, 27, -45);
		ctx.moveTo(34, -24);
		ctx.quadraticCurveTo(32, -40, 43, -42);
		ctx.stroke();
		ctx.fillStyle = COLORS.ink;
		ctx.beginPath();
		ctx.moveTo(28, 12);
		ctx.lineTo(34, 27);
		ctx.lineTo(39, 10);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = COLORS.cream;
		ctx.beginPath();
		ctx.arc(33, -9, 3, 0, TAU);
		ctx.fill();
		ctx.fillStyle = COLORS.ink;
		ctx.beginPath();
		ctx.arc(34, -9, 1.4, 0, TAU);
		ctx.fill();
	}

	drawAlpaca(ctx, animal) {
		ctx.fillStyle = 'rgba(19, 35, 28, 0.2)';
		ctx.beginPath();
		ctx.ellipse(-3, 23, 31, 9, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = animal.color;
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.ellipse(-7, 1, 34, 25, 0, 0, TAU);
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(16, 2);
		ctx.quadraticCurveTo(23, -40, 24, -62);
		ctx.lineTo(39, -61);
		ctx.quadraticCurveTo(38, -24, 35, 3);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.ellipse(34, -63, 15, 13, 0, 0, TAU);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = COLORS.ink;
		ctx.beginPath();
		ctx.arc(39, -66, 2, 0, TAU);
		ctx.fill();
	}

	drawNameTag(ctx, name, role) {
		ctx.save();
		ctx.translate(0, -62);
		ctx.font = '800 12px ui-monospace, monospace';
		const width = Math.max(ctx.measureText(name).width + 24, 78);
		ctx.fillStyle = COLORS.ink;
		roundedRect(ctx, -width / 2, -18, width, 37, 9);
		ctx.fill();
		ctx.fillStyle = COLORS.cream;
		ctx.textAlign = 'center';
		ctx.fillText(name.toUpperCase(), 0, -3);
		ctx.fillStyle = '#a8c87a';
		ctx.font = '600 9px ui-monospace, monospace';
		ctx.fillText(role.toUpperCase(), 0, 11);
		ctx.restore();
	}

	drawDog(ctx, elapsed) {
		const dog = this.dog;
		const bounce = this.reducedMotion ? 0 : Math.sin(dog.phase * 5) * Math.min(3, dog.happy * 2);
		ctx.save();
		ctx.translate(dog.x, dog.y + bounce);
		if (this.prefixArmed) {
			ctx.strokeStyle = 'rgba(255, 225, 105, 0.9)';
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.arc(0, 2, 44 + Math.sin(elapsed * 7) * 4, 0, TAU);
			ctx.stroke();
		}
		ctx.fillStyle = 'rgba(19, 35, 28, 0.25)';
		ctx.beginPath();
		ctx.ellipse(0, 24, 37, 10, 0, 0, TAU);
		ctx.fill();
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = 4;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(-17, 13);
		ctx.lineTo(-18, 29);
		ctx.moveTo(14, 13);
		ctx.lineTo(16, 29);
		ctx.stroke();
		ctx.fillStyle = '#382f2a';
		ctx.beginPath();
		ctx.ellipse(-2, 2, 34, 24, -0.08, 0, TAU);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#f1e5cc';
		ctx.beginPath();
		ctx.ellipse(11, 2, 19, 19, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = '#382f2a';
		ctx.beginPath();
		ctx.ellipse(27, -4, 16, 18, 0.15, 0, TAU);
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(20, -18);
		ctx.lineTo(15, -36);
		ctx.lineTo(30, -20);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(34, -17);
		ctx.lineTo(45, -33);
		ctx.lineTo(44, -13);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#f7f1d3';
		ctx.beginPath();
		ctx.arc(31, -8, 3.5, 0, TAU);
		ctx.fill();
		ctx.fillStyle = COLORS.ink;
		ctx.beginPath();
		ctx.arc(32, -8, 1.7, 0, TAU);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(42, 1, 4, 0, TAU);
		ctx.fill();
		ctx.fillStyle = COLORS.coral;
		ctx.beginPath();
		ctx.moveTo(14, 12);
		ctx.lineTo(30, 21);
		ctx.lineTo(32, 8);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.strokeStyle = '#382f2a';
		ctx.lineWidth = 7;
		ctx.beginPath();
		ctx.moveTo(-31, -2);
		ctx.quadraticCurveTo(-51, -19 - dog.happy * 5, -45, -31);
		ctx.stroke();
		ctx.restore();
	}

	drawFrontFence() {
		// Fence rails are intentionally drawn with the layout so animals stay legible.
	}

	drawParticles(ctx) {
		for (const particle of this.particles) {
			ctx.save();
			ctx.translate(particle.x, particle.y);
			ctx.rotate(particle.rotation);
			ctx.globalAlpha = Math.min(1, particle.life * 1.8);
			if (particle.kind === 'paper') {
				ctx.fillStyle = particle.life % 0.2 > 0.1 ? '#f1d66c' : '#fff4d2';
				ctx.fillRect(-4, -6, 8, 12);
			} else {
				ctx.fillStyle = particle.life % 0.2 > 0.1 ? '#fff6d8' : '#e8d7ac';
				ctx.beginPath();
				ctx.arc(0, 0, 4 + particle.life * 3, 0, TAU);
				ctx.fill();
			}
			ctx.restore();
		}
	}

	drawWeather(ctx, elapsed) {
		const storm = this.state.storm;
		if (storm > 0.04) {
			ctx.save();
			ctx.globalAlpha = storm * 0.33;
			ctx.fillStyle = '#1d3040';
			ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
			ctx.strokeStyle = '#d9edf0';
			ctx.lineWidth = 2;
			for (let index = 0; index < 65; index += 1) {
				const x = ((index * 79 + elapsed * 210) % 1100) - 50;
				const y = ((index * 47 + elapsed * 340) % 650) - 20;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x - 10, y + 19);
				ctx.stroke();
			}
			ctx.restore();
		}

		if (this.state.night > 0.5) {
			ctx.save();
			for (let index = 0; index < 18; index += 1) {
				const x = ((index * 101 + 73) % 850) + 75;
				const y = ((index * 61 + 17) % 250) + 280;
				ctx.globalAlpha = (this.state.night - 0.5) * (0.7 + Math.sin(elapsed * 3 + index) * 0.3);
				ctx.fillStyle = '#ffeb77';
				ctx.shadowColor = '#ffeb77';
				ctx.shadowBlur = 12;
				ctx.beginPath();
				ctx.arc(x, y, 2.5, 0, TAU);
				ctx.fill();
			}
			ctx.restore();
		}
	}

	drawLedger(ctx) {
		const amount = this.state.ledger;
		if (amount < 0.02) return;
		ctx.save();
		ctx.globalAlpha = amount;
		ctx.translate(700 + (1 - easeOut(amount)) * 220, 315);
		ctx.rotate((1 - amount) * 0.08);
		ctx.fillStyle = 'rgba(18, 29, 24, 0.26)';
		roundedRect(ctx, -168, -144, 344, 301, 17);
		ctx.fill();
		ctx.fillStyle = '#2b382f';
		ctx.strokeStyle = '#14211c';
		ctx.lineWidth = 5;
		roundedRect(ctx, -178, -156, 344, 301, 17);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#f6edcf';
		roundedRect(ctx, -156, -128, 300, 248, 9);
		ctx.fill();
		ctx.fillStyle = '#d7a958';
		roundedRect(ctx, -55, -168, 100, 28, 8);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = COLORS.ink;
		ctx.font = '800 14px ui-monospace, monospace';
		ctx.textAlign = 'left';
		ctx.fillText('WOOL CO-OP / AUG 31', -133, -93);
		const lines = [
			'Clover ........  8.4 kg',
			'Dot ............ 7.9 kg',
			'Marzipan ....... 9.1 kg',
			'Button ......... 0.0 kg',
			'Thistle ........ 0.0 kg',
		];
		for (let index = 0; index < lines.length; index += 1) {
			const y = -54 + index * 34;
			if (this.state.selection > index * 0.24) {
				ctx.fillStyle = '#ecd86d';
				roundedRect(ctx, -136, y - 19, 255, 27, 4);
				ctx.fill();
			}
			ctx.fillStyle = COLORS.ink;
			ctx.font = '600 13px ui-monospace, monospace';
			ctx.fillText(lines[index], -126, y);
		}
		ctx.restore();
	}

	drawMap(ctx) {
		const amount = this.state.map;
		if (amount < 0.02) return;
		ctx.save();
		ctx.globalAlpha = amount;
		ctx.translate(-280 + easeOut(amount) * 300, 92);
		ctx.fillStyle = '#1d312a';
		ctx.strokeStyle = '#101c18';
		ctx.lineWidth = 4;
		roundedRect(ctx, 0, 0, 286, 418, 18);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#a9ca74';
		ctx.font = '800 12px ui-monospace, monospace';
		ctx.fillText('SPACES · WORKSPACES', 24, 34);
		const details = ['3 agents', '1 agent', 'Button · blocked'];
		const fields = this.state.workspaceNames.map((name, index) => [name, details[index] ?? '1 pane']);
		for (let index = 0; index < fields.length; index += 1) {
			const y = 58 + index * 92;
			if (this.state.mapSelection === index) {
				ctx.fillStyle = '#f0d768';
				roundedRect(ctx, 13, y, 260, 74, 11);
				ctx.fill();
			}
			ctx.fillStyle = this.state.mapSelection === index ? COLORS.ink : '#f8efd4';
			ctx.font = '800 14px ui-monospace, monospace';
			ctx.fillText(fields[index][0], 30, y + 29);
			ctx.font = '500 11px ui-monospace, monospace';
			ctx.fillStyle = this.state.mapSelection === index ? '#4b5d3d' : '#9bb49f';
			ctx.fillText(fields[index][1], 30, y + 51);
		}
		ctx.fillStyle = '#718b78';
		ctx.font = '600 11px ui-monospace, monospace';
		ctx.fillText('↑/↓ move   enter open', 25, 382);
		ctx.restore();
	}

	drawHelp(ctx) {
		const amount = this.state.help;
		if (amount < 0.02) return;
		ctx.save();
		ctx.globalAlpha = amount;
		ctx.translate(500, 315);
		ctx.scale(0.88 + amount * 0.12, 0.88 + amount * 0.12);
		ctx.fillStyle = '#f8efd5';
		ctx.strokeStyle = COLORS.ink;
		ctx.lineWidth = 5;
		roundedRect(ctx, -235, -135, 470, 270, 18);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = COLORS.ink;
		ctx.textAlign = 'center';
		ctx.font = '900 20px Georgia, serif';
		ctx.fillText('ACTIVE KEYBINDINGS', 0, -92);
		ctx.font = '700 14px ui-monospace, monospace';
		ctx.fillText('c new tab    v split right    - split down', 0, -47);
		ctx.fillText('h/j/k/l focus panes    z zoom    x close', 0, -10);
		ctx.fillText('n/p tabs    W rename space    T rename tab', 0, 27);
		ctx.fillStyle = '#608044';
		ctx.font = '700 12px ui-monospace, monospace';
		ctx.fillText('w spaces   g goto   q detach   / filter', 0, 86);
		ctx.restore();
	}

	drawPrompt(ctx) {
		const amount = this.state.prompt;
		if (amount < 0.02) return;

		ctx.save();
		ctx.globalAlpha = amount;
		ctx.translate(500, 330 + (1 - easeOut(amount)) * 24);
		ctx.fillStyle = 'rgba(17, 29, 24, 0.28)';
		roundedRect(ctx, -218, -92, 448, 196, 17);
		ctx.fill();
		ctx.fillStyle = '#233a31';
		ctx.strokeStyle = '#101c18';
		ctx.lineWidth = 5;
		roundedRect(ctx, -230, -104, 448, 196, 17);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#a9ca74';
		ctx.font = '800 12px ui-monospace, monospace';
		ctx.textAlign = 'left';
		ctx.fillText(this.state.promptTitle, -198, -66);

		if (this.state.promptKind === 'confirm') {
			ctx.fillStyle = '#f8efd4';
			ctx.font = '800 18px Georgia, serif';
			ctx.fillText(`Close ${this.state.promptValue || 'this workspace'}?`, -198, -24);
			ctx.fillStyle = '#9bb49f';
			ctx.font = '600 12px ui-monospace, monospace';
			ctx.fillText('Enter confirms this workspace close', -198, 43);
		} else {
			ctx.fillStyle = '#f8efd4';
			roundedRect(ctx, -200, -42, 388, 52, 8);
			ctx.fill();
			ctx.fillStyle = COLORS.ink;
			ctx.font = '700 16px ui-monospace, monospace';
			const input = this.state.promptValue || 'type a name…';
			ctx.fillText(input.slice(0, 28), -182, -10);
			ctx.fillStyle = '#9bb49f';
			ctx.font = '600 12px ui-monospace, monospace';
			ctx.fillText('Enter saves the name', -198, 55);
		}
		ctx.restore();
	}

	drawFlash(ctx) {
		if (this.state.flash <= 0.01) return;
		ctx.save();
		ctx.globalAlpha = this.state.flash * 0.12;
		ctx.fillStyle = '#fff2ad';
		ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
		ctx.restore();
	}
}

function createAnimals(scene) {
	const base = [
		['Clover', 'sheep', 275, 330, '#f5edcf', '#31372f', 'lead ewe'],
		['Dot', 'sheep', 380, 455, '#fff8df', '#343830', 'gate critic'],
		['Marzipan', 'sheep', 570, 330, '#e9dec2', '#5a4c3e', 'fleece judge'],
		['Pip', 'sheep', 710, 465, '#c8b895', '#403930', 'lamb'],
		['Button', 'goat', 465, 340, '#b98b62', '#3b342e', 'escape artist'],
		['Thistle', 'goat', 780, 370, '#d1b084', '#3b342e', 'feed inspector'],
		['Juniper', 'alpaca', 620, 445, '#d8c3a2', '#3b342e', 'lookout'],
	];

	if (scene === 'build') {
		base[0][2] = 740;
		base[0][3] = 350;
		base[1][2] = 795;
		base[1][3] = 425;
		base[2][2] = 835;
		base[2][3] = 335;
	}

	if (scene === 'numbered') {
		base[0][2] = 260;
		base[1][2] = 285;
		base[4][2] = 500;
		base[5][2] = 735;
		base[2][2] = 720;
	}

	if (scene === 'close') {
		for (const animal of base) animal[2] = 210 + Math.random() * 300;
	}

	return base.map(([name, type, x, y, color, face, role], index) => ({
		name,
		type,
		x,
		y,
		tx: x,
		ty: y,
		homeX: x,
		homeY: y,
		color,
		face,
		role,
		phase: index * 1.17,
		speed: 0.15 + (index % 3) * 0.12,
		highlight: 0,
		startled: 0,
		sleeping: false,
	}));
}

function createFlowers(count, seed) {
	const random = seededRandom(seed);
	const colors = ['#f5d76a', '#f3a07f', '#e8e0c2', '#9fcbd0'];
	return Array.from({ length: count }, (_, index) => ({
		x: 25 + random() * 950,
		y: 225 + random() * 350,
		size: 1.5 + random() * 2.3,
		phase: random() * TAU,
		color: colors[index % colors.length],
	}));
}

function createClouds() {
	return [
		{ x: 105, y: 62, scale: 0.72, speed: 3.1 },
		{ x: 455, y: 101, scale: 0.48, speed: 2.1 },
		{ x: 790, y: 47, scale: 0.6, speed: 2.7 },
	];
}

function captionForScene(scene) {
	const captions = {
		build: 'One workspace, one tab, one pane. Add a tab without splitting it.',
		split: 'Sheep feed on the left. Goat negotiations on the right.',
		patrol: 'I go where focus goes. Give me a Vim direction.',
		tabs: 'Three pasture tabs. Only one has untouched clover.',
		numbered: 'I can smell tab 3 from here, but a shortcut is faster.',
		zoom: 'Something is loose on that north rail.',
		swap: 'Move the pane, not the animals inside it.',
		ledger: 'The tally is in pane history. We only need three lines.',
		range: 'Button is in another workspace. Again.',
		close: 'The quarantine field is empty and ready to pack away.',
		night: 'The agents are working. The sheep are pretending not to snore.',
		finale: 'Storm on the ridge. Smooth shortcuts, calm herd.',
		practice: 'Open range. I will call the jobs; you keep the rhythm.',
	};
	return captions[scene] ?? 'Waiting by the lower gate.';
}

function sceneDescription(scene) {
	const descriptions = {
		build: 'A workspace bar shows one tab and one pane while three lambs wait for a newly named tab.',
		split: 'One active tab contains a pane layout ready to split right and then down.',
		patrol: 'Four fenced panes form a grid with Moss the sheepdog in the upper-left pen.',
		tabs: 'A workspace bar shows three tabs above one active pane layout.',
		numbered: 'Three numbered tabs share one workspace, with one active tab at a time.',
		zoom: 'One tab contains two panes and a highlighted loose rail in the focused pane.',
		swap: 'Two flocks stand in side-by-side panes ready to exchange positions.',
		ledger: 'A flock beside a crate where the wool ledger will open.',
		range: 'A workspace and tab bar sits above one pane layout; the Spaces sidebar can slide in from the left.',
		close: 'A Quarantine workspace contains an empty tab with a split pane ready to close.',
		night: 'A quiet evening pasture where the herd is preparing to sleep.',
		finale: 'A divided pasture beneath a gathering rainstorm.',
		practice: 'A divided open-range practice pasture with a mixed herd.',
	};
	return descriptions[scene] ?? 'An illustrated mountain farm with sheep, goats, an alpaca, and a sheepdog.';
}

function roundedRect(ctx, x, y, width, height, radius) {
	const r = Math.min(radius, width / 2, height / 2);
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + width - r, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + r);
	ctx.lineTo(x + width, y + height - r);
	ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
	ctx.lineTo(x + r, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

function easeOut(value) {
	const clamped = clamp(value, 0, 1);
	return 1 - (1 - clamped) ** 3;
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function displayName(value, fallback) {
	return (value.trim() || fallback).slice(0, 24).toUpperCase();
}

function mixColor(from, to, amount) {
	const a = parseHex(from);
	const b = parseHex(to);
	const t = clamp(amount, 0, 1);
	return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function parseHex(value) {
	const hex = value.replace('#', '');
	return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
}

function seededRandom(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
}
