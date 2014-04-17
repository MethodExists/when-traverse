'use strict';

var whenTraverse = require('./'),
	Promise = require('es6-promise').Promise;

// delayed promise helper (for example only)
function delay(timeout, value) {
	return new Promise(function (resolve) {
		setTimeout(function () {
			resolve(value);
		}, timeout);
	});
}

// sample tree with nested simple and promised nodes
function getSampleTree() {
	return {
		a: 1,
		b: delay(100, {
			b1: delay(200, 2),
			b2: delay(300, 3)
		}),
		c: delay(400, 4),
		d: {
			shouldNotGoHere: delay(500, 5)
		}
	};
}

exports['enter+leave'] = function (test) {
	var tree = getSampleTree();

	var startTime = Date.now();

	return whenTraverse(tree, {
		enter: function (node) {
			console.log('Entered', node, 'after', (Date.now() - startTime), 'ms');

			if (typeof node === 'object' && 'shouldNotGoHere' in node) {
				return whenTraverse.SKIP;
			}
		},
		leave: function (node) {
			console.log('Left', node, 'after', (Date.now() - startTime), 'ms');

			if (node === 3) {
				return whenTraverse.REMOVE;
			}
		}
	}).then(function (newTree) {
		// got resolved tree here (everything is resolved except `d` and descendants):

		// should be same object
		test.equal(newTree, tree);

		// should have non-skipped values resolved
		test.equal(newTree.a, 1);
		test.deepEqual(newTree.b, {
			b1: 2
			// b2: 3 [REMOVE]
		});
		test.equal(newTree.c, 4);

		// d.shouldNotGoHere should not be resolved as `d` was skipped (but it should exist as Promise)
		test.ok(typeof newTree.d.shouldNotGoHere === 'object' && newTree.d.shouldNotGoHere.then instanceof Function);

		test.done();
	}, function (err) {
		test.ifError(err);
		test.done();
	});
};

exports['leave shorthand'] = function (test)  {
	var tree = getSampleTree();

	var startTime = Date.now();

	return whenTraverse(tree, function (node) {
		console.log('Left', node, 'after', (Date.now() - startTime), 'ms');

		if (node === 3) {
			return whenTraverse.REMOVE;
		}
	}).then(function (newTree) {
		// got resolved tree here (everything is resolved except `d` and descendants):

		// should be same object
		test.equal(newTree, tree);

		// should have non-skipped values resolved
		test.equal(newTree.a, 1);
		test.deepEqual(newTree.b, {
			b1: 2
			// b2: 3 [REMOVE]
		});
		test.equal(newTree.c, 4);
		test.deepEqual(newTree.d, {
			shouldNotGoHere: 5
		});

		test.done();
	}, function (err) {
		test.ifError(err);
		test.done();
	});
};

exports['just waiting'] = function (test) {
	var tree = getSampleTree();

	var startTime = Date.now();

	return whenTraverse(tree).then(function (newTree) {
		// got resolved tree here (everything is resolved except `d` and descendants):

		// should be same object
		test.equal(newTree, tree);

		test.deepEqual(newTree, {
			a: 1,
			b: {
				b1: 2,
				b2: 3
			},
			c: 4,
			d: {
				shouldNotGoHere: 5
			}
		});

		test.done();
	}, function (err) {
		test.ifError(err);
		test.done();
	});
};