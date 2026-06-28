# OpenClaw Broadcast Bot

Independent material-package robot for Mia's Web3 daily broadcast workflow.

## What v1 Does

- Builds a 24h Web3 core material package from fixed RSS/API sources.
- Scores and selects 3-5 high-signal events when available.
- Adds a fault-tolerant BTC/ETH market snapshot.
- Saves local JSON and Markdown outputs before delivery.
- Writes material packages to Feishu through Feishu OpenAPI.
- Sends Feishu direct-message notifications to Mia.
- Builds Xiaohongshu, Chinese X, and English X creation prompt packages from the saved core package.

## What v1 Does Not Do

- It does not call an LLM.
- It does not generate final publishable social copy.
- It does not publish to X or Xiaohongshu.
- It does not replace the weekly report workflow.
- It does not implement alert jobs or on-demand chat triggers.

## Setup

```bash
cd /Users/wangmia/openclaw-broadcast-bot
npm install
cp .env.example .env
cp config/mia.example.json config/mia.json
```

Edit `.env`:

```dotenv
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=replace_with_secret
```

Edit `config/mia.json` only if document tokens or the Feishu open ID change.

## Test

```bash
npm test
npm run typecheck
npm run build
```

## Run Locally

```bash
npm run dev -- daily-core
npm run dev -- daily-social-pack
```

Generated files:

- `runs/YYYY-MM-DD/core.json`
- `runs/YYYY-MM-DD/core.md`
- `runs/YYYY-MM-DD/social-pack.json`
- `runs/YYYY-MM-DD/social-pack.md`
- `logs/broadcast-bot.log`

## Manual Feishu Integration Check

Default tests mock Feishu and never write live docs. To check live delivery, run:

```bash
npm run dev -- daily-core
npm run dev -- daily-social-pack
```

Expected:

- `daily-core` appends a core material package to `Mia 素材库`.
- `daily-core` sends Mia a Feishu DM with the package status and doc link.
- `daily-social-pack` appends prompt packages to `Mia 小红书草稿箱` and `Mia X 草稿箱`.
- `daily-social-pack` sends Mia a Feishu DM saying the prompt packages are ready.

If Feishu delivery fails, inspect local `runs/` files and `logs/broadcast-bot.log`.
