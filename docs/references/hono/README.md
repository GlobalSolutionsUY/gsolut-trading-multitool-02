# Hono Framework Knowledge Base & LLM References

This directory indexes official Hono documentation and specialized LLM notes for development and AI agent context.

---

## 1. Local Knowledge Base Files

The local knowledge base files are stored in the Hono skill references directory:
- [`.agents/skills/hono/references/llms.txt`](file:///E:/projects/gsolut/gsolut-trading-multitool-02/.agents/skills/hono/references/llms.txt): Index and structural outline of all Hono documentation pages.
- [`.agents/skills/hono/references/llms-small.txt`](file:///E:/projects/gsolut/gsolut-trading-multitool-02/.agents/skills/hono/references/llms-small.txt): Concise, high-density LLM reference manual for rapid context loading.
- [`.agents/skills/hono/references/llms-full.txt`](file:///E:/projects/gsolut/gsolut-trading-multitool-02/.agents/skills/hono/references/llms-full.txt): Complete, uncompressed documentation covering all helpers, middleware, validators, and runtime adapters.

---

## 2. Upstream Canonical Sources

- Index: [https://hono.dev/llms.txt](https://hono.dev/llms.txt)
- Small LLM Guide: [https://hono.dev/llms-small.txt](https://hono.dev/llms-small.txt)
- Full LLM Reference: [https://hono.dev/llms-full.txt](https://hono.dev/llms-full.txt)
- Official Hono Agent Skill: [https://github.com/honojs/skills](https://github.com/honojs/skills)

---

## 3. Core Guidelines for This Repository

1. **Node.js Server**: Use `@hono/node-server` (`serve(app)`) as our runtime adapter.
2. **Type-Safe RPC**: Always chain route handlers (`const app = new Hono().get(...).post(...)`) to maintain strict `AppType` inference for frontend clients (`apps/web`).
3. **In-Memory Testing**: Test routes via `app.request()` without spinning up TCP ports.
4. **Validation**: Use `@hono/zod-validator` or standard schema validators for inputs.
