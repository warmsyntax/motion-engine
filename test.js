import { decomposeMatrix } from './math/matrix_decompose.js';
import { selectorNoise, applyNoise } from './physics/noise.js';
import { computeSettleTime, validateDuration } from './physics/duration_validator.js';
import { solveAxis, solveScrollReveal } from './physics/spring_solver.js';
import { fitSpringCurve, analyticalSpringDisplacement } from './physics/spring_fitter.js';
import { ThemeProfile, TypographyClass, UserIntent, KineticWeight, TriggerType, SpatialPlane, SpringAxis } from './types.js';

let passedTestsCount = 0;
let failedTestsCount = 0;

function assert(condition, message) {
  if (condition) {
    passedTestsCount++;
  } else {
    failedTestsCount++;
    console.error(`❌ FAILED: ${message}`);
  }
}

console.log('🧪 Starting motion-engine-mcp Node.js Physics & Math Test Suite...\n');

// 1. Math: matrix_decompose tests
console.log('Testing Math Decomposition...');
const decompNone = decomposeMatrix('none');
assert(decompNone.translate[0] === 0 && decompNone.translate[1] === 0, 'none transform returns defaults');

const decomp2d = decomposeMatrix('matrix(1, 0, 0, 1, 50, 100)');
assert(decomp2d.translate[0] === 50 && decomp2d.translate[1] === 100, '2D matrix translate X=50, Y=100');
assert(decomp2d.scale[0] === 1.0 && decomp2d.scale[1] === 1.0, '2D matrix scale is [1, 1]');
assert(decomp2d.rotate[2] === 0, '2D matrix rotation is 0');

const decomp3d = decomposeMatrix('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 20, 30, 1)');
assert(decomp3d.translate[0] === 10 && decomp3d.translate[1] === 20 && decomp3d.translate[2] === 30, '3D matrix translate X=10, Y=20, Z=30');
assert(decomp3d.scale[0] === 1.0 && decomp3d.scale[1] === 1.0, '3D matrix scale is [1, 1]');

// 2. Physics: FNV-1a selector-based noise tests
console.log('Testing Noise Generation...');
const n1 = selectorNoise('.btn-primary');
const n2 = selectorNoise('.btn-primary');
assert(n1 === n2, 'Noise is deterministic for identical selectors');

const n3 = selectorNoise('.btn');
const n4 = selectorNoise('.nav');
assert(n3 >= 0.0 && n3 <= 2.25 && n4 >= 0.0 && n4 <= 2.25, 'Noise values remain bounded [0, 2.25]');

// 3. Physics: Euler Integration duration validation tests
console.log('Testing Duration Validation...');
const settleCritical = computeSettleTime(300.0, 34.64, 1.0, 0.05);
assert(settleCritical > 50 && settleCritical < 500, `Critically damped spring settles within standard window: ${settleCritical}ms`);

const [kVal, cVal, mVal, settleMs] = validateDuration(2000.0, 90.0, 1.0, 150.0, 800.0);
assert(kVal < 2000.0, `Excessive stiffness reduced during validation: ${kVal}`);
assert(settleMs >= 140 && settleMs <= 850, `Settle duration corrected inside boundaries: ${settleMs}ms`);

// 4. Physics: Hooke's Law solver tests
console.log('Testing Spring Solvers...');
const themeDefault = new ThemeProfile();
const intentDefault = {
  kinetic_weight: KineticWeight.BALANCED,
  trigger: TriggerType.SCROLL,
  spatial_plane: SpatialPlane.FLAT
};
const axisParams = solveAxis({
  axis: SpringAxis.TranslateY,
  intent: intentDefault,
  theme: themeDefault,
  selector: '.hero-card',
  initial_value: 40.0,
  target_value: 0.0
});
assert(axisParams.stiffness > 0 && axisParams.damping > 0 && axisParams.mass > 0, 'Solver outputs valid spring constants');
assert(axisParams.perceptual_duration_ms >= 150 && axisParams.perceptual_duration_ms <= 800, `Spring settle time is valid: ${axisParams.perceptual_duration_ms}ms`);

const themeSerif = new ThemeProfile({ typography_class: TypographyClass.SERIF });
const axisParamsSerif = solveAxis({
  axis: SpringAxis.TranslateY,
  intent: intentDefault,
  theme: themeSerif,
  selector: '.editorial-heading',
  initial_value: 40.0,
  target_value: 0.0
});
assert(axisParamsSerif.stiffness <= 205.0, `Serif typeface caps max stiffness: ${axisParamsSerif.stiffness}`);

// 5. Physics: Grid-sweep analytical spring curve fitter tests
console.log('Testing Spring Fitter...');
let samples = [];
for (let i = 0; i < 50; i++) {
  const t = i * 0.02; // 20ms steps
  const x = analyticalSpringDisplacement(t, 300.0, 20.0, 1.0);
  samples.push({ t, x });
}
const [kFit, cFit, r2] = fitSpringCurve(samples);
assert(Math.abs(kFit - 300.0) < 10.0, `Fitted stiffness close to original: ${kFit}`);
assert(Math.abs(cFit - 20.0) < 2.0, `Fitted damping close to original: ${cFit}`);
assert(r2 > 0.99, `R2 fit quality is extremely high: ${r2}`);

console.log('\n----------------------------------------');
console.log(`Test Execution Summary:`);
console.log(`✅ Passed: ${passedTestsCount}`);
if (failedTestsCount > 0) {
  console.log(`❌ Failed: ${failedTestsCount}`);
  process.exit(1);
} else {
  console.log(`🎉 All tests passed successfully!`);
  process.exit(0);
}
