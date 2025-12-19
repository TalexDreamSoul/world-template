/**
 * 包装一个最后一个参数是 AbortSignal 的异步函数
 * @param fn 原异步函数（最后一个参数必须是 AbortSignal）
 * @returns 新函数，当 AbortSignal 中止时提前拒绝执行
 */
export function wrapAbort<T extends unknown[], R>(
  fn: (...args: [...T, AbortSignal]) => Promise<R>,
): (...args: [...T, AbortSignal]) => Promise<R> {
  return (...args: [...T, AbortSignal]) => {
    // 提取最后一个参数（AbortSignal）
    const signal = args[args.length - 1] as AbortSignal;

    // 验证最后一个参数是否是 AbortSignal
    if (!(signal instanceof AbortSignal)) {
      throw new Error("Last argument must be an AbortSignal");
    }

    // 如果信号已中止，立即拒绝
    if (signal.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }

    return new Promise<R>((resolve, reject) => {
      // 处理中止事件
      const handleAbort = () => {
        reject(new DOMException("Aborted", "AbortError"));
      };

      // 监听中止事件
      signal.addEventListener("abort", handleAbort, { once: true });

      // 执行原函数
      fn(...args)
        .then(resolve)
        .catch(reject); // 确保清理监听器
    });
  };
}
