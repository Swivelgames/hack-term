import os from 'os';

const man =
`Usage: /echo [-n] text

-n\tNo Newline\tOmits new line character after output

Example:
echo -n "Hello World"
`;

export default terminal => ({
	man,
	handler: ({ ast: { argv } }) => {
		const flags = {
			eom: os.EOL
		};

		const msg = argv.reduce((s, cV) => {
			const ret = s ? [s] : [];
			if (typeof cV === 'string') ret.push(cV);
			else if (cV.name === 'n') {
				flags.eom = '';
				ret.push(cV.value);
			}
			return ret.join(' ');
		}, '');

		terminal.echo(`${msg}${flags.eom}`);
		terminal.resolve('command.exit', 0);
	}
});
