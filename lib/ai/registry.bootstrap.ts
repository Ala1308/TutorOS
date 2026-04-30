/**
 * Bootstraps the agent + tool registries by importing every definition file
 * for its side effect (each file calls `defineAgent` / `defineTool` at import).
 *
 * Anything that calls `runAgent` or `runTool` should `import "@/lib/ai/registry.bootstrap"`
 * once at the module level (services do this transitively).
 */

import "./tools/lead";
import "./agents/leadScoring";
