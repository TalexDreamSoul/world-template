import type {
  ScriptApi,
  ScriptInitOptions,
  ScriptPlatform,
  ScriptPlatformEventMap,
  ScriptTickResult,
} from "@miehoukingdom/world-interface";
import { RpcTarget, type RpcStub } from "capnweb";

export class ApiWrapper<PlayerInit>
  extends RpcTarget
  implements ScriptApi<PlayerInit>
{
  constructor(private api: ScriptApi<PlayerInit>) {
    super();
  }
  setupPlayers(players: Record<string, PlayerInit>): void {
    return this.api.setupPlayers(players);
  }
  tick(): ScriptTickResult {
    return this.api.tick();
  }
  save(): Uint8Array {
    if (this.api.save) return this.api.save();
    throw new Error("Save method is not implemented in the underlying API.");
  }

  static wrapCreate<PlayerInit>(
    create: (options: ScriptInitOptions) => ScriptApi<PlayerInit>,
  ): (
    options: ScriptInitOptions & { platform: RpcStub<ScriptPlatform> },
  ) => ApiWrapper<PlayerInit> {
    return ({
      platform,
      ...options
    }: ScriptInitOptions & { platform: RpcStub<ScriptPlatform> }) => {
      const api = create({
        ...options,
        platform: platform.dup(),
      });
      return new ApiWrapper(api);
    };
  }
}

export class PlatformWrapper extends RpcTarget implements ScriptPlatform {
  constructor(private platform: ScriptPlatform) {
    super();
  }
  emitEvent<K extends keyof ScriptPlatformEventMap>(
    event: K,
    data: ScriptPlatformEventMap[K],
  ): void {
    return this.platform.emitEvent(event, data);
  }
}
