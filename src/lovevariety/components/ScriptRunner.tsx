import { fileOpen } from "browser-fs-access";
import { unzip, type Unzipped } from "fflate";
import { useSetAtom } from "jotai";
import { useState } from "react";
import type { AsyncTupleDatabaseClientApi } from "tuple-database";
import { useAsyncTupleDatabase } from "tuple-database/useAsyncTupleDatabase";
import { appStateAtom } from "../contexts.ts";
import { db, MapSchema } from "../db.ts";
import { createBlobUrl } from "../utils/blob.ts";
import { Uint8ArrayToArrayBuffer } from "../utils/bytes.ts";
import { parseScriptMetadata } from "../utils/parseScriptMetadata.ts";
import { useSubspace } from "../utils/useSubspace.ts";
import { SchemaForm, type JSONSchema } from "./SchemaForm.tsx";
import {
  AutoTransition,
  Button,
  Card,
  CardTitle,
  Header,
  HeightTransition,
  useConfirm,
  useError,
} from "./common/index.ts";

interface SelectableItemProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function SelectableItem({ selected, onClick, children }: SelectableItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex w-full flex-col items-stretch overflow-hidden rounded-lg border-2 text-left transition-all focus:outline-none ${
        selected
          ? "border-ctp-mauve bg-ctp-mantle"
          : "border-ctp-surface2 bg-ctp-surface1 hover:border-ctp-mauve"
      }`}
    >
      {children}
    </div>
  );
}

// 通用的空状态和加载状态组件
interface SelectorStateProps {
  isLoading: boolean;
  isEmpty: boolean;
  loadingText?: string;
  emptyText: string;
}

function SelectorState({
  isLoading,
  isEmpty,
  loadingText = "加载中...",
  emptyText,
}: SelectorStateProps) {
  if (isLoading) {
    return (
      <div className="text-ctp-subtext animate-pulse py-8 text-center">
        {loadingText}
      </div>
    );
  }

  if (isEmpty) {
    return <div className="text-ctp-subtext py-8 text-center">{emptyText}</div>;
  }

  return null;
}

async function importMap(
  subspace: AsyncTupleDatabaseClientApi<MapSchema>,
): Promise<void> {
  const file = await fileOpen({
    description: "Map Editor 新格式地图导出文件",
    excludeAcceptAllOption: true,
    extensions: [".zip"],
    mimeTypes: ["application/zip"],
    multiple: false,
  });
  const reader = new FileReader();
  const filecontent = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(file);
  });
  const unzipped = await new Promise<Unzipped>(async (resolve, reject) =>
    unzip(new Uint8Array(filecontent), (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    }),
  );
  const decoder = new TextDecoder();
  const manifest = JSON.parse(decoder.decode(unzipped["manifest.json"]));
  const map: MapSchema.Map = {
    manifest,
    background: Uint8ArrayToArrayBuffer(unzipped["background.png"]!),
    preview: Uint8ArrayToArrayBuffer(unzipped["preview.png"]!),
    entities: Uint8ArrayToArrayBuffer(unzipped["entities.png"]!),
  };
  MapSchema.insertNew(subspace, map);
}

export function ScriptRunner({ script }: { script: string }) {
  const setAppState = useSetAtom(appStateAtom);
  const showError = useError();

  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [extraOptions, setExtraOptions] = useState<unknown>(undefined);

  const mapSubspace = useSubspace(db, "map");
  const metadata = parseScriptMetadata(script);
  const scriptName = metadata.name;
  const scriptDescription = metadata.description;
  const maps = useAsyncTupleDatabase(mapSubspace, MapSchema.list, []);

  const isReady = selectedMap !== null;

  const handleMapSelect = (mapId: string) => {
    setSelectedMap(selectedMap === mapId ? null : mapId);
  };

  const handleImportMap = async () => {
    try {
      await importMap(mapSubspace);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // 用户取消了文件选择
        return;
      }
      showError({ message: `导入地图失败: ${e}` });
    }
  };

  const handleDeleteMap = (mapId: string) => {
    MapSchema.remove(mapSubspace, mapId);
    if (selectedMap === mapId) {
      setSelectedMap(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title={scriptName} subtitle={scriptDescription} back />

      <div className="mx-auto max-w-6xl p-2">
        {/* 地图选择器 */}
        <Card>
          <CardTitle
            action={
              <Button onClick={handleImportMap} variant="secondary">
                导入地图
              </Button>
            }
          >
            选择地图
          </CardTitle>
          <MapSelector
            maps={maps}
            selectedMap={selectedMap}
            onMapSelect={handleMapSelect}
            onDeleteMap={handleDeleteMap}
          />
        </Card>

        {metadata.extra && (
          <div className="mt-6">
            <Card>
              <CardTitle>配置选项</CardTitle>
              <SchemaForm
                schema={metadata.extra as JSONSchema}
                value={extraOptions}
                onChange={setExtraOptions}
              />
            </Card>
          </div>
        )}

        {/* 运行按钮 */}
        <div className="mt-6 flex justify-end">
          <Button
            disabled={!isReady}
            className="px-6 py-2"
            onClick={() =>
              setAppState({
                type: "script-sandbox",
                script: script,
                map: maps!.find((m) => m.id === selectedMap)!.value,
                extraOptions,
              })
            }
          >
            运行脚本
          </Button>
        </div>
      </div>
    </div>
  );
}

function MapSelector({
  maps,
  selectedMap,
  onMapSelect,
  onDeleteMap,
}: {
  maps: Array<{ id: string; value: MapSchema.Map }> | undefined;
  selectedMap: string | null;
  onMapSelect: (mapId: string) => void;
  onDeleteMap: (mapId: string) => void;
}) {
  const confirm = useConfirm();

  const handleDelete = async (
    e: React.MouseEvent,
    mapId: string,
    mapName: string,
  ) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "删除地图",
      message: `确定要删除地图“${mapName}”吗？此操作不可撤销。`,
      confirmLabel: "删除",
      cancelLabel: "取消",
      danger: true,
    });
    if (confirmed) {
      onDeleteMap(mapId);
    }
  };

  const stateInfo = (
    <SelectorState
      isLoading={!maps}
      isEmpty={maps?.length === 0}
      emptyText="没有可用的地图，请先导入地图"
    />
  );

  if (!maps || maps.length === 0) return stateInfo;

  return (
    <HeightTransition>
      <AutoTransition
        as="div"
        className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3"
      >
        {maps.map((mapItem) => (
          <SelectableItem
            key={mapItem.id}
            selected={selectedMap === mapItem.id}
            onClick={() => onMapSelect(mapItem.id)}
          >
            <div className="relative w-full">
              {/* 预览图区域 */}
              {mapItem.value.preview ? (
                <img
                  src={createBlobUrl(mapItem.value.preview)}
                  alt={`${mapItem.value.manifest.name} 预览图`}
                  className="bg-ctp-base h-48 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="border-ctp-surface2 bg-ctp-surface1 text-ctp-text flex h-48 w-full items-center justify-center border text-xs"
                  aria-hidden="true"
                >
                  无预览
                </div>
              )}

              {/* 删除按钮：右上角浮在图上 */}
              <div className="absolute top-2 right-2">
                <Button
                  variant="danger"
                  onClick={(e) =>
                    handleDelete(e, mapItem.id, mapItem.value.manifest.name)
                  }
                >
                  删除
                </Button>
              </div>

              {/* 文本信息 */}
              <div className="p-3">
                <div className="text-ctp-text font-medium">
                  {mapItem.value.manifest.name}
                </div>
                <div className="text-ctp-subtext0 text-sm">
                  尺寸: {mapItem.value.manifest.width} x{" "}
                  {mapItem.value.manifest.height}
                </div>
                <div className="text-ctp-subtext1 mt-1 font-mono text-xs">
                  ID: {mapItem.id}
                </div>
              </div>
            </div>
          </SelectableItem>
        ))}
      </AutoTransition>
    </HeightTransition>
  );
}
