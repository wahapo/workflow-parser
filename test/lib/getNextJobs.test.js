'use strict';

const assert = require('chai').assert;
const getNextJobs = require('../../lib/getNextJobs');
const WORKFLOW = require('../data/expected-output');

describe('getNextJobs', () => {
    it('should throw if trigger not provided', () => {
        assert.throws(() => getNextJobs(WORKFLOW, {}),
            Error, 'Must provide a trigger');
    });

    it('should throw if prNum not provided for ~pr events', () => {
        assert.throws(() => getNextJobs(WORKFLOW, { trigger: '~pr' }),
            Error, 'Must provide a PR number with "~pr" trigger');
    });

    it('should figure out what jobs start next', () => {
        // trigger for a pr event
        assert.deepEqual(getNextJobs(WORKFLOW, {
            trigger: '~pr',
            prNum: '123'
        }), ['PR-123:main']);
        // trigger for commit event
        assert.deepEqual(getNextJobs(WORKFLOW, { trigger: '~commit' }), ['main']);
        // trigger after job "main"
        assert.deepEqual(getNextJobs(WORKFLOW, { trigger: 'main' }), ['foo']);
        // trigger after job "foo"
        assert.deepEqual(getNextJobs(WORKFLOW, { trigger: 'foo' }), ['bar']);
        // trigger after job "bar""
        assert.deepEqual(getNextJobs(WORKFLOW, { trigger: 'bar' }), []);
        // trigger after non-existing job "main"
        assert.deepEqual(getNextJobs(WORKFLOW, { trigger: 'banana' }), []);

        const parallelWorkflow = {
            edges: [
                { src: 'a', dest: 'b' },
                { src: 'a', dest: 'c' },
                { src: 'a', dest: 'd' },
                { src: 'b', dest: 'e' }
            ]
        };

        // trigger multiple after job "a"
        assert.deepEqual(getNextJobs(parallelWorkflow, { trigger: 'a' }),
            ['b', 'c', 'd']);
        // trigger one after job "b"
        assert.deepEqual(getNextJobs(parallelWorkflow, { trigger: 'b' }), ['e']);

        const specificBranchWorkflow = {
            edges: [
                { src: '~commit', dest: 'a' },
                { src: '~commit:foo', dest: 'b' },
                { src: '~commit:/foo-/', dest: 'c' },
                { src: '~commit:/^bar-.*$/', dest: 'd' }
            ]
        };

        // trigger own pipeline commit
        assert.deepEqual(getNextJobs(specificBranchWorkflow, { trigger: '~commit' }), ['a']);
        // trigger "foo" branch commit
        assert.deepEqual(getNextJobs(specificBranchWorkflow, { trigger: '~commit:foo' }), ['b']);
        // trigger "foo-bar-dev" branch commit
        assert.deepEqual(getNextJobs(specificBranchWorkflow, { trigger: '~commit:foo-bar-dev' }),
            ['c']);
        // trigger "bar-foo-prod" branch commit
        assert.deepEqual(getNextJobs(specificBranchWorkflow, { trigger: '~commit:bar-foo-prod' }),
            ['c', 'd']);

        const internalOrWorkflow = {
            edges: [
                { src: 'main', dest: 'test' },
                { src: 'foobar', dest: 'test' }
            ]
        };

        assert.deepEqual(getNextJobs(internalOrWorkflow, { trigger: 'main' }), ['test']);
        assert.deepEqual(getNextJobs(internalOrWorkflow, { trigger: 'foobar' }), ['test']);
    });
});
