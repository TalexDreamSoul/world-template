export function animloop(callback: () => number): () => void {
  let stopped = false;
  let lastTime = 0;
  let nextInterval = 0; // 初始为 0，确保第一次调用

  const stop = () => {
    stopped = true;
  };

  const loop = (currentTime: number) => {
    if (stopped) return;

    // 如果有间隔限制且未到时间，则跳过调用，但继续调度下一帧
    if (nextInterval > 0 && currentTime - lastTime < nextInterval) {
      requestAnimationFrame(loop);
      return;
    }

    // 执行回调
    const framerate = callback();
    lastTime = currentTime;

    // 根据返回的 framerate 计算下次间隔
    nextInterval = framerate === 0 ? 0 : 1000 / framerate;

    // 如果未停止，继续调度下一帧
    if (!stopped) {
      requestAnimationFrame(loop);
    }
  };

  // 启动循环
  requestAnimationFrame(loop);

  return stop;
}
