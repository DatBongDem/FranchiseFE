import { useCallback, useEffect, useRef, useState } from "react";
export function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const reload = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError("");
    try {
      const result = await loader();
      if (current === version.current) setData(result);
    } catch (err) {
      if (current === version.current) {
        setData(undefined);
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
      }
    } finally {
      if (current === version.current) setLoading(false);
    }
  }, deps);
  useEffect(() => {
    void reload();
    return () => {
      version.current++;
    };
  }, [reload]);
  return { data, loading, error, reload };
}
