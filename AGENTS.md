# AGENTS.md — Reusable Patterns for Hirvo.Ai

## Supabase Database Types

- `lib/database.types.ts` must include `Relationships: []` on **every** table definition AND `Views: Record<string, never>` in the schema object. Without these, `@supabase/supabase-js` v2.93.2 resolves `.insert()`, `.update()`, and other mutations to `never` type.
- The full schema structure requires: `Tables`, `Views`, `Functions`, `Enums` keys.

## Supabase Clients

- `createClient()` from `lib/supabase/server.ts` = user-scoped, cookie-based, respects RLS. Use in API routes and Server Components.
- `createServiceRoleClient()` from `lib/supabase/server.ts` = admin, bypasses RLS. NEVER expose to browser.
- `createClient()` from `lib/supabase/client.ts` = browser client for client components.

## Auth Pattern in API Routes

- Always call `supabase.auth.getUser()` and return 401 if no user.
- Use `getUser()` over `getSession()` — Supabase docs warn `getSession()` reads from spoofable cookies.

## Testing

- `vitest.config.ts` exists with `@/` path alias. Run tests with `npx vitest run <file>` or `npx vitest run` for all.
- Mock OpenAI API calls — never hit real APIs in tests.
- Use the `docx` npm package (`Document`, `Packer`, `Paragraph`, `TextRun`) to create test DOCX fixtures programmatically.
- Tests live in `lib/__tests__/` directory.

## Parsers

- `pdf-parse` v2 is class-based: `new PDFParse({ data })` → `getText()` → `destroy()`. Always call `destroy()` in a `finally` block.
- `mammoth.extractRawText({ buffer })` returns `{ value, messages }` — check `messages` for errors.
- Both parsers return `{ text: string, pageCount: number }` via the `ParseResult` interface from `@/lib/parsers`.

## Build & Typecheck

- Run `npx tsc --noEmit` for type checking.
- Run `npm run build` for full build verification.
- ESLint enforces `no-unused-vars` — unused imports will fail the build.
