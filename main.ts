// Obsidian Terminal Token Radar (Radar-2) Champion Entrypoint v2.1
// Engineered with empirical comps-calibrated multi-sector multiples for make.fun token-radar-01.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const APP_ROOT = fileURLToPath(new URL('.', import.meta.url));

interface RadarCliOptions {
  inputPath: string;
  outputPath: string;
}

const DOSSIER_CONSTRAINTS = {
  textMaxBytes: 65_536,
  screenshotLimits: { max: 4, max_bytes: 524_288 },
  dashboardLimits: { max_files: 400, max_bytes: 4_194_304 },
  validImageRegex: /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/,
};

function parseCliArguments(args: string[]): RadarCliOptions {
  let inputVal = '/input';
  let outputVal = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  for (let idx = 0; idx < args.length; idx++) {
    const item = args[idx];
    if (item === '--input' && idx + 1 < args.length) {
      inputVal = args[++idx];
    } else if (item.startsWith('--input=')) {
      inputVal = item.slice('--input='.length);
    } else if (item === '--output' && idx + 1 < args.length) {
      outputVal = args[++idx];
    } else if (item.startsWith('--output=')) {
      outputVal = item.slice('--output='.length);
    }
  }

  const resolvedInput = inputVal.endsWith('.json') ? inputVal : join(inputVal, 'snapshot.json');
  return { inputPath: resolvedInput, outputPath: outputVal };
}

function replicateDirectory(sourceDir: string, targetDir: string): string[] {
  if (!existsSync(sourceDir)) return [];
  mkdirSync(targetDir, { recursive: true });
  const transferredFiles: string[] = [];
  const entries = readdirSync(sourceDir);
  for (const entryName of entries) {
    if (entryName.startsWith('.')) continue;
    const fullSourcePath = join(sourceDir, entryName);
    const stat = statSync(fullSourcePath);
    if (!stat.isFile()) continue;
    const fullDestPath = join(targetDir, entryName);
    copyFileSync(fullSourcePath, fullDestPath);
    transferredFiles.push(entryName);
  }
  return transferredFiles;
}

function executeRadarPipeline(): void {
  const options = parseCliArguments(process.argv.slice(2));

  if (!existsSync(options.inputPath)) {
    process.stderr.write(`[radar-2-champion] snapshot file not found: ${options.inputPath}\n`);
    process.exit(2);
  }

  const rawSnapshotText = readFileSync(options.inputPath, 'utf8');
  const snapshotData = parseSnapshot(rawSnapshotText);
  const { board, radar } = buildRadar(snapshotData);

  const validationFault = boardIssue(board, snapshotData);
  if (validationFault !== null) {
    process.stderr.write(`[radar-2-champion] gate refusal: ${validationFault}\n`);
    process.exit(1);
  }

  mkdirSync(options.outputPath, { recursive: true });
  const boardJsonPath = join(options.outputPath, 'board.json');
  writeFileSync(boardJsonPath, `${JSON.stringify({ rows: board }, null, 2)}\n`);

  const dataScriptPath = join(options.outputPath, 'data.js');
  writeFileSync(dataScriptPath, dataScript(radar));

  const destDashboard = join(options.outputPath, 'dashboard');
  const destScreenshots = join(options.outputPath, 'screenshots');
  const copiedDashboard = replicateDirectory(join(APP_ROOT, 'dashboard'), destDashboard);
  const copiedScreenshots = replicateDirectory(join(APP_ROOT, 'screenshots'), destScreenshots);

  if (copiedScreenshots.length < 3) {
    process.stderr.write(`[radar-2-champion] required $\\ge$ 3 screenshots, found ${copiedScreenshots.length}\n`);
    process.exit(1);
  }

  for (const shot of copiedScreenshots) {
    if (!DOSSIER_CONSTRAINTS.validImageRegex.test(shot)) {
      process.stderr.write(`[radar-2-champion] invalid screenshot name: ${shot}\n`);
      process.exit(1);
    }
  }

  const dossierPayload = buildDossier(options.outputPath, {
    text_max_bytes: DOSSIER_CONSTRAINTS.textMaxBytes,
    screenshots: DOSSIER_CONSTRAINTS.screenshotLimits,
    dashboard: DOSSIER_CONSTRAINTS.dashboardLimits,
  });

  const dossierJsonPath = join(options.outputPath, 'dossier.json');
  writeFileSync(dossierJsonPath, dossierPayload);

  process.stdout.write(
    `[radar-2-champion] scored ${board.length} protocols across ${snapshotData.protocols.length} total (${radar.early_size} pre-token, ${radar.live_size} active watchlist).\n` +
      `[radar-2-champion] artifacts created: board.json, data.js, dashboard (${copiedDashboard.length} assets), screenshots (${copiedScreenshots.length} images), dossier.json.\n`,
  );
}

executeRadarPipeline();
