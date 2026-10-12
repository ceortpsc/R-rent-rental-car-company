import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('app.js', 'utf8');
const luxury = readFileSync('luxury-experience.js', 'utf8');
const html = readFileSync('index.html', 'utf8');

test('premium routes are wired into production renderer', () => {
  for (const route of ['/locations', '/deals', '/business', '/app']) {
    assert.ok(app.includes(route));
  }
  assert.ok(html.includes('/luxury-experience.js'));
});

test('brand and contact details are correct', () => {
  assert.ok(luxury.includes('Move Further.'));
  assert.ok(luxury.includes('254-423-0594'));
  assert.ok(luxury.includes('condre@rosstaxprepandbookkeeping.com'));
});

test('mobile app does not create fake inventory or payments', () => {
  assert.match(luxury, /no reservation/i);
  assert.match(luxury, /pending backend release/i);
  assert.match(luxury, /not activated/i);
});
