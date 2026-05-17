# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # First-time setup: install deps + prisma generate + migrate
npm run dev            # Start dev server with Turbopack at localhost:3000
npm run build          # Production build
npm run lint           # ESLint
npm test               # Run all Vitest tests
npm run db:reset       # Reset the SQLite database (destructive)
```

To run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

**Do not run `npm audit fix`** — dependencies are pinned to compatible versions; audit fix can break the app.

## Code Style

- Use comments sparingly. Only comment complex or non-obvious code.

## Architecture

UIGen is an AI-powered React component generator. The user describes a component in a chat, Claude generates code via tool calls, and the result renders live in a sandboxed iframe.

### Virtual File System

All generated code lives in an in-memory `VirtualFileSystem` (`src/lib/file-system.ts`), never written to disk. The class supports full CRUD on a tree of `FileNode` objects. It's serialized as a flat `Record<string, FileNode>` for database storage and API transport.

Two AI tools wrap this FS:
- `str_replace_editor` (`src/lib/tools/str-replace.ts`) — `view`, `create`, `str_replace`, `insert` commands for file editing
- `file_manager` (`src/lib/tools/file-manager.ts`) — `rename` and `delete`

### State Management (Contexts)

`FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`) holds the `VirtualFileSystem` instance and exposes React state wrappers. It also handles `handleToolCall`, which intercepts AI tool calls streamed from the server and applies them to the FS in real time.

`ChatProvider` (`src/lib/contexts/chat-context.tsx`) wraps Vercel AI SDK's `useChat`, passing the serialized FS and `projectId` with every request body so the server can reconstruct the current file state.

### Preview Pipeline

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) rebuilds the iframe on every `refreshTrigger`. The pipeline in `src/lib/transform/jsx-transformer.ts`:
1. Transpiles all `.jsx`/`.tsx` files with Babel Standalone
2. Creates blob URLs for each transpiled file
3. Builds an ES module import map (local files → blob URLs; third-party packages → `esm.sh`)
4. Generates a full HTML document with Tailwind CDN, the import map, and a `ReactDOM.createRoot` bootstrap
5. Sets `iframe.srcdoc` — uses `allow-scripts allow-same-origin` sandbox for blob URL support

Entry point is `/App.jsx` by default (falls back to first `.jsx`/`.tsx` found).

### AI / Provider

`src/lib/provider.ts` returns either `anthropic("claude-haiku-4-5")` or a `MockLanguageModel` when `ANTHROPIC_API_KEY` is absent or set to the placeholder. The mock produces canned Counter/Form/Card components across 4 tool-call steps.

The chat API route (`src/app/api/chat/route.ts`) streams with `maxSteps: 40` (4 for mock) and persists the full message history + file system snapshot to the database after each turn — only for authenticated users with a `projectId`.

### Auth & Persistence

JWT sessions in httpOnly cookies (`lib/auth.ts`), 7-day expiry. The `User` and `Project` models are in SQLite via Prisma (`prisma/schema.prisma`). `messages` and `data` columns store JSON strings (message history and serialized FS respectively). `userId` is nullable — projects can be anonymous but won't be persisted.

Anonymous users' work is tracked in `sessionStorage` via `src/lib/anon-work-tracker.ts` and is lost when the session ends.

### Layout

The UI is a two-panel resizable layout (`src/app/main-content.tsx`): Chat on the left, Preview/Code tabs on the right. In Code view, the right panel splits further into a file tree and Monaco editor.

### Generation Rules (System Prompt)

From `src/lib/prompts/generation.tsx`:
- Every project must have a root `/App.jsx` as its default export
- Style with Tailwind, not inline styles; no HTML files
- Non-library imports use the `@/` alias (e.g. `@/components/Button`)
- The virtual FS root is `/`
