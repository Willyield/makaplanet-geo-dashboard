// Bound the complete transfer, including a response whose headers arrived but body stalls.
const pending = new Map();
export const DATA_TIMEOUT_MS = 20000;
export function readJson(input, {timeoutMs = DATA_TIMEOUT_MS} = {}) {
  const key = String(input);
  if (pending.has(key)) return pending.get(key);
  const operation = new Promise((resolve, reject) => {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => {
      const error = new Error('读取超过20秒，可能是网络较慢或连接中断。');
      error.name = 'DataTimeoutError';
      finish(error);
      if (controller) controller.abort();
    }, timeoutMs);
    Promise.resolve().then(() => fetch(key, controller ? {signal: controller.signal} : {}))
      .then(response => {
        if (!response.ok) throw new Error('服务器暂时无法提供文件（HTTP ' + response.status + '）。');
        return response.text();
      })
      .then(text => { if (!settled) finish(null, JSON.parse(text)); })
      .catch(error => finish(error));
  });
  const cached = operation.catch(error => {
    if (pending.get(key) === cached) pending.delete(key);
    throw error;
  });
  pending.set(key, cached);
  return cached;
}
