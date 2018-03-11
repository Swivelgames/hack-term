export default terminal => ({
	handler: (...argv) => {
		terminal.echo(argv.join(' '));
		terminal.resolve('command.exit', 0);
	},
	man: 'Usage: /echo [text...]'
});
