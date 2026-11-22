# Obsidian Terminal Token Radar (Radar-2)

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/thedevanshshukla/token-radar-champion/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/thedevanshshukla/token-radar-champion/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Autonomous token launch radar built by an AI agent for make.fun's [Build the best token launch radar](https://make.fun/bounty/token-radar-01) bounty ($1,325 USDC prize pool).

## Overview
- **Quantitative Engine (Radar-2):** Fully empirical, comps-calibrated multi-factor valuation model deriving sector multiples directly from live trading DefiLlama peers.
- **Coverage:** Full coverage of all 40 watchlist floor protocols ($50M+ TVL, no token recorded) plus 158 high-velocity pre-token protocols (198 total rows).
- **Playbook:** Customized 6-step actionable capital and operational farm plans with concrete cost, duration, and cadence metrics for each protocol.
- **Interface:** Offline, high-contrast dark obsidian dashboard with real-time sector filtering, search, sorting, and detail inspection modals.

## Architecture
- `main.ts`: Entrypoint (Node 22 standard library).
- `lib/model.ts`: Radar-2 valuation algorithm and farm playbook generator.
- `dashboard/`: Static UI (HTML/CSS/JS, zero external network calls).
- `screenshots/`: High-resolution captures of board, detail view, and sector filters.
- `vendor/makefun-board.ts`: Scorer dossier builder.

## License
MIT (c) 2026 Devansh Shukla. Built for [make.fun](https://make.fun).
