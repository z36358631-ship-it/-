import {
  PLAYTEST_SEEDS,
  assertBalanceGates,
  formatBalanceReport,
  runBalanceValidation,
} from '../simulation/report';

const report = runBalanceValidation({
  seeds: PLAYTEST_SEEDS,
  targetingTrials: 10_000,
});

process.stdout.write(`${formatBalanceReport(report)}\n`);

try {
  assertBalanceGates(report);
  process.stdout.write('\nRESULT: PASS\n');
} catch (error) {
  process.stderr.write(
    `\nRESULT: FAIL\n${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
