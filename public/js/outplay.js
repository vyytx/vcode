var args;
function OUTPLAY() {
	var new_container = document.createElement("div");
		new_container.id = "containerOutplay";
		new_container.className = "container";
	document.getElementById("root").appendChild(new_container);
	$("#containerOutplay").append(`<div id="outplay"><div id="topbar"><div id="spoiler">Console</div></div><div id="runCode"><span>🡺</span></div></div>`);

	Log = console.log;
	console.log = function() {
		args = Array.from(arguments);
		for(var i = 0; i < args.length; i++) {
			if(typeof args[i] == "undefined") {
				args[i] = "undefined";
			}
		}
		args.map(e => {
			if(typeof e != "string") {
				if(typeof e == "object") {
					return JSON.stringify(e);
				}
				return e.toString();
			}
			return e;
		});
		Log.apply(null, arguments);
		text = args.join("").split("\n");
		for(var i of text) {
			if($(".out").last().hasClass("end") || !$(".out").length) {
				$("#outplay").append(`<div class="out">${i}</div>`);
			}else if(i == "") {
				$(".out").last().addClass("end");
			}else {
				$(".out").last().text($(".out").last().text() + i);
			}
		}
		// $("#outplay").append(`<div class="out">${text}</div>`);
	}

	$("#runCode").click(function(e) {
		e.preventDefault();
		$("#outplay").find(".out").remove();
		var code = monaco.editor.getModels()[0].getValue();
		Log("code", code);
		var ast = parse(TokenStream(InputStream(code)));
		Log("ast", ast);
		Execute(evaluate, [ ast, globalEnv, function(result){
			console.log("***Global last value: ", result);
		}]);
	});
	// new_container.appendChild(outplay);
}