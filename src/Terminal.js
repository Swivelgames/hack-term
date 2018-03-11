import os from 'os';
import fs from 'fs';
import path from 'path';
import meddle from 'meddle';
import readline from 'readline';
import Dispatcher from 'thenable-events';

import parser from './parser/parser.js';

const Private = new WeakMap();

export default class Terminal {
	constructor(config) {
		meddle(this);

		Private.set(this, {
			commands: {},
			mans: {},
			errors: []
		});

		this.setConfig(config || {});

		this.initDispatcher();
		this.initEvents();
		this.initReadline();
		this.initBuiltIns();

		if (this.config.motd) {
			this.resolve('stdout', `${this.config.motd || ''}${os.EOL}`);
		}
	}

	initBuiltIns() {
		try {
			const cmdsPath = path.resolve(path.join(__dirname, 'commands'));
			fs.readdirSync(cmdsPath)
				.map(f => path.join(cmdsPath, f))
				.filter(f => !fs.statSync(f).isDirectory())
				.map(f => [
					path.basename(f, '.js'),
					require(f).default
				])
				.forEach(([name, factory]) => {
					this.registerCommand(name, factory(this));
				});
		} catch (e) {
			this.handleError(e);
		}
	}

	initDispatcher() {
		const Priv = Private.get(this);

		Priv.disp = new Dispatcher(null, null, this.handleError.bind(this));

		const { disp } = Priv;

		this.when = event => disp.when(`terminal.${event}`);
		this.resolve = (event, data) => disp.resolve(`terminal.${event}`, data);
		this.reject = (event, data) => disp.reject(`terminal.${event}`, data);
	}

	initEvents() {
		// Store thenable's
		this.stdin = this.when('stdin');
		this.stdout = this.when('stdout');
		this.stderr = this.when('stderr');
		this.readline = this.when('readline');

		// Attach listeners
		this.when('command.exec').then(cmd => this.handleCommand(cmd));
		this.when('command.exit').then(() => {
			this.prompt();
		});
		this.stdout.then(msg => this.echo(msg));
		this.stderr.then(msg => this.echo(msg, true, 'error'));
		this.readline.then(msg => this.parseReadline(msg));
	}

	initReadline() {
		const Priv = Private.get(this);

		Priv.readline = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		Priv.readline.on('line', msg => this.resolve('readline', msg));

		this.prompt();
	}

	parseReadline(raw) {
		let ast = '';

		try {
			ast = parser.parse(raw);
		} catch (e) {
			this.resolve('stderr', `-term: ${e}`);
			this.handleError(e);
			return;
		}

		this.resolve('command.exec', { raw, ast });
	}

	prompt() {
		const Priv = Private.get(this);
		Priv.curInput = '';
		Priv.readline.setPrompt(this.getPrompt());
		Priv.readline.prompt(true);
	}

	getPrompt() {
		return `${this.config.username}${this.config.promptDelim}`;
	}

	redrawPrompt(newLine, curInput) {
		/* eslint-disable no-console */
		if (newLine) console.log(' ');
		/* eslint-enable */

		const Priv = Private.get(this);
		const input = curInput || Priv.curInput || ' ';

		const prompt = this.getPrompt();

		Priv.readline.setPrompt(prompt);

		const text = `${prompt}${input}`;

		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(text);
		process.stdout.cursorTo((text.length) - 1);

		Priv.readline.resume();
	}

	echo(msg, forceEcho, method = 'log') {
		if (this.config.verbose && !forceEcho) return;

		const Priv = Private.get(this);

		Priv.readline.pause();
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		/* eslint-disable no-console */
		console[method](...[].concat(msg));
		/* eslint-enable */
		this.redrawPrompt();
	}

	registerCommand(name, pkg) {
		const Priv = Private.get(this);
		const { commands, mans } = Priv;

		let handler;
		let man = `No manual for ${name} command.`;

		if (typeof pkg === 'function') {
			handler = pkg;
		} else if (Array.isArray(pkg)) {
			[handler, man] = pkg;
		} else if (typeof pkg === 'object') {
			handler = pkg.handler;
			man = pkg.man || man;
		}

		commands[name] = handler;
		mans[name] = man;
	}

	handleCommand(payload) {
		const { ast } = payload;
		if (Array.isArray(ast)) {
			ast.forEach(
				cmd => this.handleCommand({ ast: cmd, raw: payload.raw })
			);
			return;
		}

		const { cmd, argv /* , div */ } = ast;

		const Priv = Private.get(this);

		if (cmd === 'error') {
			const errors = [...Priv.errors];
			while (errors.length) {
				this.resolve('stderr', errors.shift());
			}
			this.resolve('command.exit', 0);
			return;
		}

		const { commands, mans } = Priv;

		if (cmd === 'man') {
			this.resolve('stdout', mans[argv[0]]);
			this.resolve('command.exit', 0);
			return;
		}

		if (Object.getOwnPropertyNames(commands).indexOf(cmd) === -1) {
			this.handleError(`Unknown command: ${cmd}`);
			return;
		}

		let resp;
		try {
			resp = commands[cmd](payload);
		} catch (e) {
			this.handleError(e);
			return;
		}

		if (resp === void 0) return;

		if (resp === 0) {
			this.resolve('command.exit', 0);
		} else {
			this.reject('command.exit', resp);
		}
	}

	handleError(e) {
		if (e instanceof Error) {
			const { errors } = Private.get(this);
			errors.push(e);
			this.resolve('stderr', 'Error: (Type /error to view stack)');
			this.resolve('command.exit', 1);
			return;
		}
		this.resolve('stderr', e);
		this.resolve('command.exit', 1);
	}

	when(event) {
		return this.disp.when(`terminal.${event}`);
	}

	resolve(event, data) {
		return this.disp.resolve(`terminal.${event}`, data);
	}

	reject(event, data) {
		return this.disp.reject(`terminal.${event}`, data);
	}

	setConfig(config) {
		this.config = Object.assign({
			promptDelim: '$ ',
			username: process.env.USER,
			motd: 'Welcome to the Hackable REPL',
			verbose: false
		}, config);
	}
}
