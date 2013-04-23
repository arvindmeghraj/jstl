(function (global) {
	var templateMap = {};
	var loadedUrls = {};
	function loadTemplates(url) {
		if (url == undefined) {
			var scripts = document.getElementsByTagName("script");
			var lastScript = scripts[scripts.length - 1];
			url = lastScript.getAttribute("src");
		}
		if (loadedUrls[url]) {
			return;
		}
		loadedUrls[url] = true;

		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, false);
		xhr.send();
		var code = xhr.responseText;

		var result = {};
		var parts = code.split(/\/\*\s*[Tt]emplate:/);
		parts.shift();
		for (var i = 0; i < parts.length; i++) {
			var part = parts[i];
			part = part.substring(0, part.indexOf("*/"));
			var endOfLine = part.indexOf("\n");
			var key = part.substring(0, endOfLine).trim();
			var template = part.substring(endOfLine + 1);
			templateMap[key] = template;
		}
		return result;
	}
	function getTemplate(key) {
		loadTemplates();
		var rawCode = templateMap[key];
		if (rawCode) {
			return create(rawCode);
		}
		return null;
	}
	function create(rawCode) {
		return {
			toString: function () {return this.code;},
			code: rawCode,
			compile: function (directEvalFunction, constFunctions) {
				return compile(this.code, directEvalFunction, constFunctions);
			}
		};
	}

	function compile(template, directEvalFunction, headerText) {
		if (directEvalFunction == undefined) {
			directEvalFunction = publicApi.defaultFunction;
		}
		if (headerText == undefined) {
			headerText = publicApi.defaultHeaderCode;
		}
		var constants = [];
		var variables = [];
		
		var substitutionFunctionName = "subFunc" + Math.floor(Math.random()*1000000000);
		var resultVariableName = "result" + Math.floor(Math.random()*1000000000);
		var jscode = '(function () {\n';
		
		var directFunctions = [];
		var directFunctionVarNames = [];
		var parts = template.split("<?");
		var initialString = parts.shift();
		jscode += '	var ' + resultVariableName + ' = ' + JSON.stringify(initialString) + ';\n';
		jscode += '	var echo = function (str) {' + resultVariableName + ' += str;};\n';
		if (headerText) {
			jscode += "\n" + headerText + "\n";
		}
		while (parts.length > 0) {
			var part = parts.shift();
			if (part.substring(0, 2) == "js") {
				part = part.substring(2);
			}
			var endIndex = part.indexOf("?>");
			var embeddedCode = part.substring(0, endIndex);
			var constant = part.substring(endIndex + 2);
			
			if (/\s/.test(embeddedCode.charAt(0))) {
				jscode += "\n" + embeddedCode + "\n";
			} else {
				var argName = "fn" + Math.floor(Math.random()*10000000000);
				directFunctionVarNames.push(argName);
				directFunctions.push(directEvalFunction(embeddedCode));
				jscode += "\n\t" + resultVariableName + " += " + argName + ".apply(this, arguments);\n";
			}
			
			jscode += '	' + resultVariableName + ' += ' + JSON.stringify(constant) + ';\n';
		}
		jscode += '\n	return ' + resultVariableName + ';\n})';
		
		var f = Function.apply(null, directFunctionVarNames.concat(["return " + jscode]));
		return f.apply(null, directFunctions);
	}
	
	function defaultFunction(varName) {
		return function (data) {
			var string = "" + data[varName];
			return string.replace("&", "&amp;").replace("<", "&lt;").replace(">", "gt;").replace('"', "&quot;").replace("'", "&#39;");
		};
	};
	
	var publicApi = {};
	publicApi.loadTemplates = loadTemplates;
	publicApi.getTemplate = getTemplate;
	publicApi.create = create;
	publicApi.defaultFunction = defaultFunction;
	publicApi.defaultHeaderCode = "var value = arguments[0];";
	global.jstpl = publicApi;
})((typeof module !== 'undefined' && module.exports) ? exports : this);