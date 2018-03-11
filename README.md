# term-repl

Simple Terminal-style REPL

## Run

```shell
npx term-repl
```

## Node API

```javascript
import { Terminal } from 'term-repl';

const TerminalInstance = new Terminal({
	promptDelim: '$ ',
	username: process.env.USER,
	motd: 'Welcome to the Hackable REPL',
	verbose: false
});
```

### Middleware

This library leverages `meddle` to enable the use of middleware via `TerminalInstance.use()`.

```javascript
const myMiddleware = (Term) => {
	Term.registerCommand('myCommand', {
		handler: () => {
			Term.resolve('stdout', 'Hello World!');
			Term.resolve('command.exit', 0);
		},
		man: `Usage: /myCommand`
	});
}

TerminalInstance.use(myMiddleware);
```

See [`API.md`](https://github.com/Swivelgames/term-repl/wiki/Terminal-API) for more details!

#### `TerminalInstance.registerCommand(name, package)`

**Parameters**
- name `string` -> `/${name}${...argv}`
- package `object` -> `{ handler: fn(argv), man: 'Usage / Help Info' }`

**Example:**

```javascript
TerminalInstance.registerCommand('myCommand', {
	handler: () => {
		Term.resolve('stdout', 'Hello World!');
		Term.resolve('command.exit', 0);
	},
	man: `Usage: /myCommand`
});
```

### Events

In addition `thenable-events` is used to enable promise-compatible events.

- `stdout`: Resolved to output text
- `stdin`: Resolved when data is piped in
- `stderr`: Resolved to output error text
- `command.exec`: Resolved with AST when commands will be executed
- `command.exit`: Resolved or Rejected when a command exits

#### Listening For Events `.when(event).then(fn)`

Listening for events is done using `.when().then()` syntax.

```javascript
TerminalInstance
	.when('stdout')
	.then((txt) => {
		console.log('Something outputted!', txt)
	});
```

#### Resolving / Rejecting Events

Resolving / Rejecting events (similar to `emit`ing in traditional event-based systems) are done through the `.resolve()` and `.reject()` methods:

```javascript
TerminalInstance.resolve('stdout', 'Output something...'); // Output
TerminalInstance.reject('command.exit', 127); // "Command exited with non-zero"
```
