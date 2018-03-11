export default terminal => ({
	handler: () => {
		/* Should be overwritten by primary middleware */
		terminal.resolve('command.exit', 0);
	},
	man: 'Usage: /echo [text...]'
});
