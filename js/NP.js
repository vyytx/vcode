var NP = (function (exports) {
	'use strict';
	
	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation.
	Permission to use, copy, modify, and/or distribute this software for any
	purpose with or without fee is hereby granted.
	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
	REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
	AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
	INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
	OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
	PERFORMANCE OF THIS SOFTWARE.
	***************************************************************************** */
	/* global Reflect, Promise */
	
	function __spreadArrays() {
		for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
		for (var r = Array(s), k = 0, i = 0; i < il; i++)
			for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
				r[k] = a[j];
		return r;
	}
	
	/**
	 * @desc 解決浮動運算問題，避免小數點後產生多位數和計算精度損失。
	 * 問題示例：2.3 + 2.4 = 4.699999999999999，1.0 - 0.9 = 0.09999999999999998
	 */
	/**
	 * 把錯誤的數據轉正
	 * strip(0.09999999999999998)=0.1
	 */
	function strip(num, precision) {
		if (precision === void 0) { precision = 15; }
		return +parseFloat(Number(num).toPrecision(precision));
	}
	/**
	 * Return digits length of a number
	 * @param {*number} num Input number
	 */
	function digitLength(num) {
		// Get digit length of e
		var eSplit = num.toString().split(/[eE]/);
		var len = (eSplit[0].split('.')[1] || '').length - +(eSplit[1] || 0);
		return len > 0 ? len : 0;
	}
	/**
	 * 把小數轉換成整數，支援科學記號表示法。如果是小數則放大成整數
	 * @param {*number} num 输入数
	 */
	function float2Fixed(num) {
		if (num.toString().indexOf('e') === -1) {
			return Number(num.toString().replace('.', ''));
		}
		var dLen = digitLength(num);
		return dLen > 0 ? strip(Number(num) * Math.pow(10, dLen)) : Number(num);
	}
	/**
	 * 檢測數字是否超越邊界，若超越將給予提示
	 * @param {*number} num 輸入數
	 */
	function checkBoundary(num) {
		if (_boundaryCheckingState) {
			if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
				console.warn(num + " is beyond boundary when transfer to integer, the results may not be accurate");
			}
		}
	}
	/**
	 * 精確乘法
	 */
	function times(num1, num2) {
		var others = [];
		for (var _i = 2; _i < arguments.length; _i++) {
			others[_i - 2] = arguments[_i];
		}
		if (others.length > 0) {
			return times.apply(void 0, __spreadArrays([times(num1, num2), others[0]], others.slice(1)));
		}
		var num1Changed = float2Fixed(num1);
		var num2Changed = float2Fixed(num2);
		var baseNum = digitLength(num1) + digitLength(num2);
		var leftValue = num1Changed * num2Changed;
		checkBoundary(leftValue);
		return leftValue / Math.pow(10, baseNum);
	}
	/**
	 * 精確加法
	 */
	function plus(num1, num2) {
		var others = [];
		for (var _i = 2; _i < arguments.length; _i++) {
			others[_i - 2] = arguments[_i];
		}
		if (others.length > 0) {
			return plus.apply(void 0, __spreadArrays([plus(num1, num2), others[0]], others.slice(1)));
		}
		var baseNum = Math.pow(10, Math.max(digitLength(num1), digitLength(num2)));
		return (times(num1, baseNum) + times(num2, baseNum)) / baseNum;
	}
	/**
	 * 精確減法
	 */
	function minus(num1, num2) {
		var others = [];
		for (var _i = 2; _i < arguments.length; _i++) {
			others[_i - 2] = arguments[_i];
		}
		if (others.length > 0) {
			return minus.apply(void 0, __spreadArrays([minus(num1, num2), others[0]], others.slice(1)));
		}
		var baseNum = Math.pow(10, Math.max(digitLength(num1), digitLength(num2)));
		return (times(num1, baseNum) - times(num2, baseNum)) / baseNum;
	}
	/**
	 * 精確除法
	 */
	function divide(num1, num2) {
		// vyytx add Line 121
		if(num2 == 0) throw new Error("Divide by zero");
		var others = [];
		for (var _i = 2; _i < arguments.length; _i++) {
			others[_i - 2] = arguments[_i];
		}
		if (others.length > 0) {
			return divide.apply(void 0, __spreadArrays([divide(num1, num2), others[0]], others.slice(1)));
		}
		var num1Changed = float2Fixed(num1);
		var num2Changed = float2Fixed(num2);
		checkBoundary(num1Changed);
		checkBoundary(num2Changed);
		// fix: 類似 10 ** -4 为 0.00009999999999999999，strip 修正
		return times(num1Changed / num2Changed, strip(Math.pow(10, digitLength(num2) - digitLength(num1))));
	}
	/**
	 * 四捨五入
	 */
	function round(num, ratio) {
		var base = Math.pow(10, ratio);
		return divide(Math.round(times(num, base)), base);
	}
	var _boundaryCheckingState = true;
	/**
	 * 是否進行邊界檢查，預設開啟
	 * @param flag 開關標記，true 為開啟，false 為關閉，預設為 true
	 */
	function enableBoundaryChecking(flag) {
		if (flag === void 0) { flag = true; }
		_boundaryCheckingState = flag;
	}
	var index = {
		strip: strip,
		plus: plus,
		minus: minus,
		times: times,
		divide: divide,
		round: round,
		digitLength: digitLength,
		float2Fixed: float2Fixed,
		enableBoundaryChecking: enableBoundaryChecking,
	};
	
	exports.strip = strip;
	exports.plus = plus;
	exports.minus = minus;
	exports.times = times;
	exports.divide = divide;
	exports.round = round;
	exports.digitLength = digitLength;
	exports.float2Fixed = float2Fixed;
	exports.enableBoundaryChecking = enableBoundaryChecking;
	exports['default'] = index;
	
	return exports;
	
}({}));