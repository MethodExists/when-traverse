var this$0 = this;(function(factory ) {
	var hasPromise = typeof Promise !== 'undefined' &&
		typeof Promise.cast !== 'undefined' &&
		typeof Promise.resolve !== 'undefined' &&
		typeof Promise.all !== 'undefined';

	if (typeof define === 'function' && define.amd) {
		// loading Promise polyfill only when it's not available natively
		define(hasPromise ? [] : ['//cdnjs.cloudflare.com/ajax/libs/bluebird/1.2.2/bluebird.js'], function()  {return factory(Promise)});
	} else if (typeof exports === 'object') {
		module.exports = factory(hasPromise ? Promise : require('bluebird'));
	} else {
		this$0.whenTraverse = factory(Promise);
	}
})(function(Promise ) {
	'use strict';

	/* polyfilling missing methods in some current browser implementations */

	var resolve = Promise.resolve.bind ?
		Promise.resolve.bind(Promise) :
		(function(arg ) {return new Promise(function(resolve ) {return resolve(arg)})});
	var asPromise = Promise.cast.bind ?
		Promise.cast.bind(Promise) :
		(function(arg ) {return arg instanceof Promise ? arg : resolve(arg)});

	var isObject = function(node ) {return typeof node === 'object' && node !== null};
	var isSkipped = function(node ) {return node === WhenTraverse.SKIP || node === WhenTraverse.REMOVE};

	var WhenTraverse = (function(){
		function WhenTraverse(node, options) {var this$0 = this;
			if (!(this instanceof WhenTraverse)) {
				return new WhenTraverse(node, options);
			}

			switch (typeof options) {
				case 'object':
					var enter = this._wrapWhen(options.enter);
					var leave = this._wrapWhen(options.leave);

					this.visit = function(node, key, parentNode)
						{return enter(node, key, parentNode)
						.then(function(node ) {return this$0.into(node)})
						.then(function(node ) {return isSkipped(node) ? node : leave(node, key, parentNode)})}
					 ;

					break;

				case 'function':
					this.visit = this._wrapWhen(options);
					break;

				case 'undefined':
					this.visit = this.into;
					break;

				default:
					throw new TypeError('Unsupported visitor config.');
			}

			return this.visit(node);
		}

		WhenTraverse.prototype._wrapWhen = function(func) {var this$0 = this;
			return func ? (function(node, key, parentNode)
				{return asPromise(func.call(this$0, node, key, parentNode))
				.then(function(newValue ) {return newValue === undefined ? node : newValue})}
			) : resolve;
		}

		WhenTraverse.prototype.into = function(node) {var this$0 = this;
			if (!isObject(node) || isSkipped(node)) {
				return Promise.resolve(node);
			}

			return Promise.all(Object.keys(node).map(function(key ) {
				var subNode = node[key];

				return asPromise(subNode)
					.then(function(subNode ) {return this$0.visit(subNode, key, node)})
					.then(function(newSubNode ) {
						if (!isSkipped(newSubNode)) {
							if (newSubNode !== subNode) {
								node[key] = newSubNode;
							}
						} else {
							if (newSubNode === WhenTraverse.REMOVE) {
								delete node[key];
							}
						}
					});
			})).then(function()  {return node});
		}
	;return WhenTraverse;})();

	// defining non-modifiable constants
	['SKIP', 'REMOVE'].forEach(function(name ) {return Object.defineProperty(WhenTraverse, name, {enumerable: true, value: {}})});

	return WhenTraverse;
});