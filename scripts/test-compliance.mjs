import { extractNegativeConstraints } from '../src/lib/designConstraints.ts';
import { validateCompliance, summariseFindings, violationsOf } from '../src/lib/complianceValidator.ts';

const cases = [
  {
    name: 'house, no flat roof, no right angles, curved facade required',
    prompt: 'Two-story house with no flat roof and no right angles, must have a curved facade',
    artifact: {
      openscadCode: `// Brutalist mid-century
cube([8000, 6000, 3000]);
cube([800, 800, 3000]);
cube([1200, 800, 3000]);
roof_assembly(type="flat", span=8000, depth=6000);`,
      designNotes: 'A modernist box with a flat roof.',
    },
  },
  {
    name: 'house, no flat roof, no right angles, curved facade required (compliant output)',
    prompt: 'Two-story house with no flat roof and no right angles, must have a curved facade',
    artifact: {
      openscadCode: `wall_assembly(length=8000, height=3000, thickness=305);
rotate_extrude($fn=120) polygon([[0,0],[3000,0],[3000,2800],[1500,3000],[0,2800]]);
roof_assembly(type="gabled", span=8000, depth=6000, pitch_deg=30);`,
      designNotes: 'A house with a gabled roof and a curved facade defined by rotate_extrude.',
    },
  },
  {
    name: 'robot, no servos, stepper motors only',
    prompt: 'Build a robot. No servos. Use stepper motors only.',
    artifact: {
      openscadCode: 'NEMA17(); cube([100,100,4]);',
      designNotes: 'Robot uses one stepper motor and one MG996R servo for the gripper.',
      wiringDiagram: 'PCA9685 -> 12x servos',
    },
  },
];

for (const c of cases) {
  console.log('===', c.name, '===');
  const set = extractNegativeConstraints(c.prompt);
  console.log('  constraints:', set);
  const findings = validateCompliance(set, c.artifact);
  console.log(`  ${violationsOf(findings).length} violation(s), ${findings.length - violationsOf(findings).length} warning(s)`);
  for (const f of findings) console.log('   ', f.severity.toUpperCase(), '[' + f.code + ']', f.message);
  console.log('  ---');
  console.log(summariseFindings(findings).split('\n').map(l => '  ' + l).join('\n'));
  console.log();
}
