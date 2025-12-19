import { createPipeline } from "@codehz/pipeline";
import {
  PlayerId,
  type BasePlayerStatusMap,
} from "@miehoukingdom/world-interface";
import {
  OnClick,
  PlayerTexture,
  RendererWorld,
  Tracking,
  WorldRenderer,
  type MapData,
  type PipelineInput,
} from "@miehoukingdom/world-renderer";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import bubbleIcons from "../../../assets/icons.png";
import playerTexture from "../../../assets/player.png";
import { createBlobUrl } from "../../utils/blob.ts";
import { useSandboxContext } from "./SandboxContext.tsx";

/**
 * 玩家状态气泡图标配置
 */
const playerStatusMap: BasePlayerStatusMap = {
  thinking: {
    url: bubbleIcons,
    w: 16,
    h: 16,
    frames: [
      [0 * 16, 0],
      [1 * 16, 0],
      [2 * 16, 0],
      [3 * 16, 0],
    ],
    framerate: 2,
    pivotX: 0.5,
    pivotY: 0.8,
  },
  wondering: {
    url: bubbleIcons,
    w: 16,
    h: 16,
    frames: [[9 * 16, 1 * 16]],
    framerate: 0,
    pivotX: 0.5,
    pivotY: 0.8,
  },
  tip: {
    url: bubbleIcons,
    w: 16,
    h: 16,
    frames: [[7 * 16, 2 * 16]],
    framerate: 0,
    pivotX: 0.5,
    pivotY: 0.8,
  },
  speaking: {
    url: bubbleIcons,
    w: 16,
    h: 16,
    frames: [[3 * 16, 0 * 16]],
    framerate: 0,
    pivotX: 0.5,
    pivotY: 0.8,
  },
};

/**
 * Sandbox Renderer 组件
 * 负责世界渲染和玩家同步
 */
export function SandboxRenderer() {
  const { map, allPlayers, autoTick, playerSync, rendererEvents } =
    useSandboxContext();

  // 纹理查找函数
  const getPlayerTexture = useEffectEvent((id: string): PlayerTexture => {
    const player = allPlayers?.find((p) => p.id === id);
    const sprites = player?.sprites;
    if (sprites) {
      return {
        url: createBlobUrl(sprites.texture),
        w: sprites.w * 4,
        h: sprites.h * 4,
      };
    }
    return {
      url: playerTexture,
      w: 88,
      h: 112,
    };
  });

  // 初始化渲染世界和 pipeline
  const [{ world, pipeline }] = useState(() => {
    const entitiesBlobUrl = createBlobUrl(map.entities);
    const world = new RendererWorld({
      manifest: map.manifest,
      entitiesSrc: entitiesBlobUrl,
      getPlayerTexture,
      playerStatusMap,
    });
    world.hook(PlayerId, {
      on_set(entityId, _, playerId) {
        world.set(entityId, OnClick, () => {
          world.set(entityId, Tracking);
          rendererEvents.emit("playerClicked", { playerId });
        });
      },
    });
    const pipeline = createPipeline<PipelineInput>()
      .addPass(world.basePipeline)
      .build();
    return { world, pipeline };
  });

  // 订阅玩家同步事件
  useEffect(
    () =>
      playerSync.subscribe((players) => {
        world.syncPlayerInfo(players);
      }),
    [playerSync, world],
  );

  // 计算地图数据
  const mapData = useMemo<MapData>(
    () => ({
      width: map.manifest.width * 16,
      height: map.manifest.height * 16,
      background: createBlobUrl(map.background),
    }),
    [map],
  );

  return (
    <div className="relative flex-1">
      <WorldRenderer
        map={mapData}
        pipeline={pipeline}
        className="absolute inset-0 size-full! touch-none"
        paused={!autoTick}
      />
    </div>
  );
}
