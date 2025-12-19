import { runCJSModule } from "@codehz/min-cjs-runner";
import type { ScriptEntrypoint } from "@miehoukingdom/world-interface";
import { newMessagePortRpcSession } from "capnweb";
import { ApiWrapper } from "./wrapper.ts";

import * as ecsNS from "@codehz/ecs";
import * as pipelineNS from "@codehz/pipeline";
import * as worldInterfaceNS from "@miehoukingdom/world-interface";
import * as worldRuntimeNS from "@miehoukingdom/world-runtime";

function unwrapModuleNamespace<T extends object>(mod: T): T {
  // Some bundlers wrap ESM deps into `{ default: ... }` interop objects.
  // runCJSModule expects CommonJS-like exports, so normalize here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((mod as any).default ?? mod) as T;
}

const ecs = unwrapModuleNamespace(ecsNS);
const pipeline = unwrapModuleNamespace(pipelineNS);
const worldInterface = unwrapModuleNamespace(worldInterfaceNS);
const worldRuntime = unwrapModuleNamespace(worldRuntimeNS);

self.addEventListener("message", (ev) => {
  const port = ev.ports[0];
  if (!port) return;
  const exports = runCJSModule(ev.data, {
    "@codehz/ecs": ecs,
    "@codehz/pipeline": pipeline,
    "@miehoukingdom/world-interface": worldInterface,
    "@miehoukingdom/world-runtime": worldRuntime,
  }) as { default: ScriptEntrypoint };
  const entrypoint = exports.default;
  newMessagePortRpcSession(port, {
    name: entrypoint.name,
    description: entrypoint.description,
    create: ApiWrapper.wrapCreate(entrypoint.create),
  });
});
