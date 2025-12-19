import type {
  ScriptApi,
  ScriptEntrypoint,
  ScriptInitOptions,
} from "@miehoukingdom/world-interface";
import { newMessagePortRpcSession, RpcStub, RpcTarget } from "capnweb";

type Stub = RpcStub<
  ScriptEntrypoint<never> & {
    create: (options: ScriptInitOptions) => ScriptApi<unknown> & RpcTarget;
  }
>;

const worker_cache = new Map<string, [Stub, Worker]>();

export function launch(script: string): Stub {
  if (worker_cache.has(script)) {
    return worker_cache.get(script)![0];
  }
  const worker = new Worker(new URL("./entry.ts", import.meta.url), {
    type: "module",
  });
  const channel = new MessageChannel();
  worker.postMessage(script, [channel.port1]);
  const stub = newMessagePortRpcSession(channel.port2) as Stub;
  worker_cache.set(script, [stub, worker]);
  return stub;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const [stub, worker] of worker_cache.values()) {
      stub[Symbol.dispose]();
      worker.terminate();
    }
    worker_cache.clear();
  });
}
