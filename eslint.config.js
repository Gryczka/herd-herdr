import js from '@eslint/js';
import globals from 'globals';

export default [
	{
		ignores: ['dist/**', 'node_modules/**', '.wrangler/**'],
	},
	js.configs.recommended,
	{
		files: ['public/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.browser,
		},
		rules: {
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		},
	},
	{
		files: ['test/**/*.js', '*.config.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.node,
		},
	},
];
