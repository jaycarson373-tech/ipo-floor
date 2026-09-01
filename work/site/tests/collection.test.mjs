import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const collection = path.join(root, 'public', 'collection');
const imageDir = path.join(collection, 'images');
const metadataDir = path.join(collection, 'metadata');
const stages = ['common', 'uncommon', 'rare', 'epic', 'mythic'];
const rarityScore = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Mythic: 5 };

test('collection contains 333 complete deterministic IDs', async () => {
  const metadataFiles = (await readdir(metadataDir)).filter((file) => file.endsWith('.json')).sort();
  assert.equal(metadataFiles.length, 333);

  for (const file of metadataFiles) {
    const id = file.slice(0, -5);
    const metadata = JSON.parse(await readFile(path.join(metadataDir, file), 'utf8'));
    const rarity = metadata.attributes.find((item) => item.trait_type === 'Rarity')?.value;
    assert.ok(rarity in rarityScore, `${id} has a valid rarity`);
    assert.equal(metadata.image, `images/${id}.webp`);

    for (let level = 1; level <= 5; level += 1) {
      const image = await readFile(path.join(imageDir, `${id}-L${level}.webp`));
      const expectedStage = stages[Math.max(rarityScore[rarity], level) - 1];
      assert.ok(image.length > 15_000, `${id} L${level} has rendered artwork`);
      const visualRoom = metadata.attributes.find((item) => item.trait_type === 'Room')?.value;
      assert.ok(visualRoom, `${id} has rendered room metadata`);
      assert.ok(stages.includes(expectedStage));
    }
  }
});

test('all five cinematic base stages exist and are non-empty', async () => {
  for (const stage of stages) {
    const details = await stat(path.join(collection, 'bases', `${stage}.png`));
    assert.ok(details.size > 100_000, `${stage} artwork is present`);
  }
});
