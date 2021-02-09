require.config({ paths: { 'vs': 'vs' } });
require(['vs/editor/editor.main'], function () {
	
	var new_container = document.createElement("div");
	new_container.id = "containerEditor";
	new_container.className = "container";
	document.getElementById("root").appendChild(new_container);


	monaco.languages.register({ id: 'Vcode' });

	var dcode = 
`fib = func(n) {
	if (n <= 2) {
		ret 1;
	} else {
		ret (fib(n - 1) + fib(n - 2));
	}
};
i = 1;

while(i <= 10) {
	out("fib(", i, ")\\n");
	time(func() { out(fib(i), "\\n"); });
	i = i+1;
}
`;

	// Register a tokens provider for the language
	monaco.languages.setMonarchTokensProvider('Vcode', {
		// Set defaultToken to invalid to see what you do not tokenize yet
		defaultToken: 'invalid',

		flowKeywords: ['if', 'then', 'else', 'ret', 'true', 'false', 'while'],
		typeKeywords: ['func', 'boolean', 'number', 'array', 'string', 'undefined'],
		operators: ['<', '>', '<=', '>=', '==', '!=', '+', '-', '*', '/', '%', '&&', '||'],
	
		// we include these common regular expressions
		symbols: /[=><!~?:&|+\-*\/\^%]+/,
		escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
		digits: /\d+(_+\d+)*/,
	
		// The main tokenizer for our languages
		tokenizer: {
			root: [
				[/[{}]/, 'delimiter.bracket'],
				{ include: 'common' }
			],
	
			common: [
				// identifiers and keywords
				[/[a-z_$][\w$]*/, {
					cases: {
						'@typeKeywords': 'typeKeywords',
						'@flowKeywords': 'flowKeywords',
						'@default': 'variable'
					}
				}],
				[/[A-Z][\w\$]*/, 'type.identifier'],  // to show class names nicely
				// [/[A-Z][\w\$]*/, 'identifier'],
	
				// whitespace
				{ include: '@whitespace' },
	
				// delimiters and operators
				[/[()\[\]]/, '@brackets'],
				[/[<>](?!@symbols)/, '@brackets'],
				[/@symbols/, {
					cases: {
						'@operators': 'delimiter',
						'@default': ''
					}
				}],
	
				// numbers
				[/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
				[/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
				[/(@digits)/, 'number'],
	
				// delimiter: after number because of .\d floats
				[/[;,.]/, 'delimiter'],
	
				// strings
				[/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
				[/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
				[/"/, 'string', '@string_double'],
				[/'/, 'string', '@string_single'],
				[/`/, 'string', '@string_backtick'],
			],
	
			whitespace: [
				[/[ \t\r\n]+/, ''],
				[/\#\#/, 'comment', '@comment'],
				[/\#.*$/, 'comment'],
			],
	
			comment: [
				[/[^\#]+/, 'comment'],
				[/\#\#/, 'comment', '@pop'],
				[/[\#*]/, 'comment']
			],
	
			string_double: [
				[/[^\\"]+/, 'string'],
				[/@escapes/, 'string.escape'],
				[/\\./, 'string.escape.invalid'],
				[/"/, 'string', '@pop']
			],
	
			string_single: [
				[/[^\\']+/, 'string'],
				[/@escapes/, 'string.escape'],
				[/\\./, 'string.escape.invalid'],
				[/'/, 'string', '@pop']
			],
	
			string_backtick: [
				[/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
				[/[^\\`$]+/, 'string'],
				[/@escapes/, 'string.escape'],
				[/\\./, 'string.escape.invalid'],
				[/`/, 'string', '@pop']
			],
	
			bracketCounting: [
				[/\{/, 'delimiter.bracket', '@bracketCounting'],
				[/\}/, 'delimiter.bracket', '@pop'],
				{ include: 'common' }
			],
		},
	});

	monaco.editor.defineTheme('myCustomTheme', {
		base: 'vs-dark', // can also be vs-dark or hc-black
		inherit: true, // can also be false to completely replace the builtin rules
		rules: [
			{ token: 'variable', foreground: "9cdcfe" },
			{ token: 'flowKeywords', foreground: "c586c0" },
			{ token: 'typeKeywords', foreground: "569cd6" },
		]
	});

	// 新建一个编辑器
	editor = (function newEditor(container_id, language) {
		var editor = monaco.editor.create(document.getElementById(container_id), {
			language: language,
			theme: 'myCustomTheme',
			renderLineHighlight: 'none',
			fontSize: 20,
			tabSize: 4,
			insertSpaces: false,
			value: dcode
		});
		return editor;
	})(new_container.id, "Vcode");
	OUTPLAY();
});

