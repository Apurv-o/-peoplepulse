import { MockElement, createMockEnvironment, loadPlayerModule } from '../../demo_video_player/tests/harness.mjs';

const env = createMockEnvironment();
await loadPlayerModule('js/presentationData.js', env);
await loadPlayerModule('js/sceneSimulator.js', env);
const SceneSimulator = env.window.SceneSimulator;
const scene = new SceneSimulator();
scene.init();
scene.update(210.0, { id: 5, name: 'Adaptation' });

const card1 = env.document.getElementById('card-ev_act_1');
console.log('card1 id:', card1.id);
console.log('card1 children count:', card1.children.length);
for (const ch of card1.children) {
  console.log('  Child:', ch.tagName, ch.className, ch.id);
}
console.log('card1 querySelector .card-payload-details:', card1.querySelector('.card-payload-details')?.className);
console.log('card1 querySelector .card-callout-banner:', card1.querySelector('.card-callout-banner')?.className);
