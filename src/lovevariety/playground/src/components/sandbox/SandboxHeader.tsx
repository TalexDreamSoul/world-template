import { useCallback, useState } from "react";
import { Button, Header, ModalDialog, Toggle } from "../common/index.ts";
import { PlayerHeaderPanel } from "../player-panel/PlayerHeaderPanel.tsx";
import { useSandboxContext } from "./SandboxContext.tsx";
import { SnapshotAnalyzer } from "./SnapshotAnalyzer.tsx";

/**
 * Sandbox Header 组件
 * 包含标题、玩家管理面板和 tick 控制
 */
export function SandboxHeader() {
  const {
    map,
    metadata,
    allPlayers,
    selectedPlayers,
    selectedPlayerObjects,
    autoTick,
    setAutoTick,
    manualTick,
    saveSnapshot,
    addPlayer,
    removePlayer,
    updatePlayerConfig,
  } = useSandboxContext();

  // 快照分析对话框状态
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotData, setSnapshotData] = useState<Uint8Array | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);

  // 打开快照分析对话框
  const handleOpenSnapshotDialog = useCallback(async () => {
    setIsLoadingSnapshot(true);
    setSnapshotDialogOpen(true);
    try {
      const data = await saveSnapshot();
      setSnapshotData(data);
    } catch (error) {
      console.error("Failed to save snapshot:", error);
      setSnapshotData(null);
    } finally {
      setIsLoadingSnapshot(false);
    }
  }, [saveSnapshot]);

  // 关闭快照分析对话框
  const handleCloseSnapshotDialog = useCallback(() => {
    setSnapshotDialogOpen(false);
  }, []);

  // 清理对话框数据（动画结束后）
  const handleSnapshotDialogAnimationEnd = useCallback(() => {
    setSnapshotData(null);
  }, []);

  // 下载快照到本地
  const handleDownloadSnapshot = useCallback(() => {
    if (!snapshotData) return;
    const blob = new Blob([new Uint8Array(snapshotData)], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snapshot-${Date.now()}.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [snapshotData]);

  return (
    <>
      <Header
        title={map.manifest.name ?? "地图预览"}
        subtitle={`${map.manifest.width} x ${map.manifest.height}`}
        back
        right={
          <div className="flex items-center gap-2">
            <PlayerHeaderPanel
              allPlayers={allPlayers}
              selectedPlayers={selectedPlayerObjects}
              metadata={metadata}
              playerConfigs={selectedPlayers}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onUpdateConfig={updatePlayerConfig}
            />
            <div onMouseDown={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleOpenSnapshotDialog}
                title="快照分析"
              >
                快照分析
              </Button>
            </div>
            <div onMouseDown={(e) => e.stopPropagation()}>
              <Toggle
                checked={!!autoTick}
                onChange={(checked) => setAutoTick(checked)}
                label={"自动"}
                disabled={false}
                aria-label="自动 Tick"
              />
            </div>
            <div onMouseDown={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => manualTick()}
                disabled={!!autoTick}
                title={
                  autoTick
                    ? "自动 tick 已启用，先暂停后可手动触发"
                    : "手动触发一次 tick"
                }
              >
                Tick
              </Button>
            </div>
          </div>
        }
      />

      {/* 快照分析对话框 */}
      <ModalDialog
        title="快照分析"
        open={snapshotDialogOpen}
        onOpenChange={setSnapshotDialogOpen}
        onCloseAnimationEnd={handleSnapshotDialogAnimationEnd}
        className="w-[1200px]! max-w-[90vw]!"
      >
        <div className="flex flex-col gap-4">
          {isLoadingSnapshot ? (
            <p className="text-ctp-subtext0">正在生成快照...</p>
          ) : snapshotData ? (
            <SnapshotAnalyzer
              data={snapshotData}
              players={allPlayers ?? []}
              onDownload={handleDownloadSnapshot}
              onClose={handleCloseSnapshotDialog}
            />
          ) : (
            <>
              <p className="text-ctp-red">快照生成失败或脚本不支持保存快照</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={handleCloseSnapshotDialog}>
                  关闭
                </Button>
              </div>
            </>
          )}
        </div>
      </ModalDialog>
    </>
  );
}
