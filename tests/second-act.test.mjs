import test from 'node:test';
import assert from 'node:assert/strict';
import {levels, storyLevels, cats, catMoment} from '../site/levels.js';
import {memories, reactionFor} from '../site/cat-behavior.js';
import {configureLevel, surfaces, initialState, fit, ready} from '../site/room-model.js';

test('the second afternoon connects the album promise while preserving the archived story', () => {
  assert.deepEqual(levels.map(level => level.id), ['home', 'flowers', 'books']);
  assert.equal(levels[2].next, null);
  assert.deepEqual(storyLevels.map(level => level.id), ['home', 'flowers', 'books', 'cafe', 'rooftop', 'courtyard']);
  assert.ok(storyLevels[2].next);
  assert.equal(storyLevels.at(-1).next, null);
  assert.match(storyLevels.at(-1).clue, /今天的合照/);
});

test('new chapters fit every support, save independently, and finish without memory requirements', () => {
  try {
    for (const level of storyLevels.slice(3)) {
      configureLevel(level.id);
      const state = initialState();
      assert.equal(level.items.length, 8);
      assert.equal(ready(state), false);
      assert.ok(level.items.some(item => item.id === level.restItem));
      assert.ok(cats[level.cat]);
      assert.equal(new Set([level.cat, ...level.visitors.map(visitor => visitor.id)]).size, level.visitors.length + 1);
      for (const item of level.items) {
        assert.ok(item.story);
        for (const surface of surfaces.filter(surface => surface.accepts)) {
          for (let orientation = 0; orientation < 4; orientation++) {
            assert.ok(fit(surface.id, item.id, surface.x, surface.y, orientation), `${level.id}:${item.id}:${surface.id}`);
          }
        }
        state[item.id] = fit('desk', item.id, 2.5, 3);
      }
      assert.ok(ready(state));
      assert.equal(catMoment(level, state, true).pose, 'sleep');
      for (const id of Object.keys(level.reactions)) {
        const event = reactionFor(level, state, id);
        assert.ok(memories[level.cat][event.memory]);
        const boxed = {...state, [id]: {...state[id], surface:'box'}};
        assert.equal(reactionFor(level, boxed, id), null);
      }
    }
  } finally { configureLevel('home'); }
});

test('the new photo starts blank and is a completion keepsake, not a placement objective', () => {
  const final = storyLevels.at(-1);
  const photo = final.items.find(item => item.id === 'today-photo');
  assert.equal(photo.motif, 'blank');
  assert.equal(photo.reveal_on_complete, 'cats');
  assert.equal(new Set(storyLevels.flatMap(level => level.items.map(item => `${level.id}:${item.id}`))).size, 47);
});
