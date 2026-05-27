import { extractNegativeConstraints } from '../src/lib/designConstraints.ts';

const cases = [
  'A two-story house with no flat roof and no right angles, must have a curved facade',
  'Build a robot. No servos, no plywood. Should use stepper motors only.',
  'Design a kitchen with no upper cabinets and avoid white finishes',
  "I don't want anything modernist. Without glass walls. Required: brick and stone facing.",
  'Just a simple box',
];

for (const prompt of cases) {
  console.log('---');
  console.log('PROMPT:', JSON.stringify(prompt));
  const r = extractNegativeConstraints(prompt);
  console.log('forbidden:', r.forbidden);
  console.log('required:', r.required);
}
