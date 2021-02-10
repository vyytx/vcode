require.config({ paths: { 'vs': 'vs' } });
require(['vs/editor/editor.main'], function () {
	
	var new_container = document.createElement("div");
	new_container.id = "containerEditor";
	new_container.className = "container";
	document.getElementById("root").appendChild(new_container);


	monaco.languages.register({ id: 'Vcode' });

	var defaultCode = 
`#這是單行註解
#這個範例程式是為了解釋「vcode」的功能

#------------
#　基本功能
#------------

#輸出"hello, world\\n"的字串
out("hello, world!\\n");

#利用javascript原生的prompt輸出含有'請輸入你的暱稱'字串的提問對話視窗
nickname = in('請輸入你的暱稱');
#輸出「nickname」所代表的字串
out("Hello, ", nickname, "!\\n");

#若您輸入的「nickname」為"John"，執行第16行，非"John"，執行第18行
if(nickname == "John") {
	out("You are John.\\n");
}else {
	out("You are not John, but it is nice to meet you.\\n");
};

#將「i」定義為數字0
i = 0;
#當「i<10」此條件成立時重複執行25~26行，因此將會逐行輸出數字0~9
while(i < 10) {
	out(i, "\\n");
	i = i + 1;
};

#將「abs」定義為一函式，並設有一項參數「n」
abs = func(n) {			#此函式將以會回傳「n」絕對值
	#此為 if 的單行寫法，while 也有相同的功能
	if(n < 0) then n = 0-n;
	#回傳更改過的「n」
	ret n;
};
#用於判斷「abs(0-10) == abs(10)」，相同則輸出布林值true，否則輸出布林值false
if(abs(0-10) == abs(10)) {
	out(true, "\\n");
}else {
	out(false, "\\n");
};

#將執行time的第一個參數(type == function)，並將執行時間輸出
str = "";
j = 0;
time(func() {
	while(str != "0123456789") {
		str = str + j;
		out(str, "\\n");
		j = j + 1;
	};
});

#將輸入轉換成字串
out(toString(1 + 2), "\\n");
#將輸入轉換成數字
out(toNumber("1") + toNumber("2"), "\\n");

#用來區隔
out("\\n\\n\\n\\n");

#------------
#　複合功能
#------------

# 將"fib"定義為一函式，並設有一項參數「n」 (第66~73行)
fib = func(n) {		#此函式將以遞回的方式計算費式數列的第「n」項
	#判斷參數「n」是否小於等於2，若是，進入第8行，若否，進入第10行
	if (n <= 2) {	
		ret 1;
	} else {
		ret (fib(n - 1) + fib(n - 2));	#進行遞回
	}
};
#輸入「a」
a = in("n = ?", "number");	#in 的特殊寫法，在輸入後就就預先處理成數字
k = 1;
while(k <= a) {
	out("fib(", k, ")\\n");
	time(func() { out(fib(k, "\\n\\n")) });
	k = k + 1;
};

"Thanks for reading~";
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
				[/\#.*$/, 'comment'],
			],
	
			comment: [
				[/[^\#]+/, 'comment'],
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

	// create
	editor = (function newEditor(container_id, language) {
		var editor = monaco.editor.create(document.getElementById(container_id), {
			language: language,
			theme: 'myCustomTheme',
			renderLineHighlight: 'none',
			fontSize: 20,
			tabSize: 4,
			insertSpaces: false,
			value: defaultCode,
			automaticLayout: true
		});
		return editor;
	})(new_container.id, "Vcode");
	OUTPLAY();
});

