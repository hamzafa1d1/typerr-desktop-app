# react-ts

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Smart Audit (Local LLM)

Typerr includes a local audit analysis layer.

1. Open the dashboard and click `Run Analysis` in `Smart Audit Analysis`.
2. If no model is configured, Typerr uses a deterministic heuristic fallback.
3. To use a local model with `node-llama-cpp`, set this environment variable before running:

```bash
export TYPERR_LLM_MODEL="/absolute/path/to/your/model.gguf"
pnpm dev
```

Example (npm):

```bash
TYPERR_LLM_MODEL="/absolute/path/to/your/model.gguf" npm run dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```
