import { runCJSModule } from "@codehz/min-cjs-runner";
import type { ScriptEntrypoint } from "@miehoukingdom/world-interface";
import { newMessagePortRpcSession } from "capnweb";
import { ApiWrapper } from "./wrapper.ts";

import * as ecs from "@codehz/ecs";
import * as pipeline from "@codehz/pipeline";
import * as worldInterface from "@miehoukingdom/world-interface";
import * as worldRuntime from "@miehoukingdom/world-runtime";

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
