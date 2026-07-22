import { useCallback, useEffect, useMemo, useState } from "react";

function useApi(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    fetch(path, { signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message || "Request failed"); return body.data; })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => { if (error.name !== "AbortError") setState({ data: null, loading: false, error: error.message || "Catalogue unavailable" }); });
    return () => controller.abort();
  }, [path, attempt]);
  return { ...state, retry: useCallback(() => setAttempt((value) => value + 1), []) };
}

export function useProducts(filters) {
  const path = useMemo(() => { const params = new URLSearchParams(); Object.entries(filters || {}).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "" && value !== "all") params.set(key, String(value)); }); return `/api/products?${params}`; }, [filters]);
  const result = useApi(path);
  return { products: result.data?.products || [], pagination: result.data?.pagination || { page: 1, total: 0, totalPages: 0 }, loading: result.loading, error: result.error, retry: result.retry };
}

export function useBrands(type) { const result = useApi(`/api/brands${type ? `?type=${encodeURIComponent(type)}` : ""}`); return { brands: result.data?.brands || [], loading: result.loading, error: result.error, retry: result.retry }; }
export function useCategories(type) { const result = useApi(`/api/categories${type ? `?type=${encodeURIComponent(type)}` : ""}`); return { categories: result.data?.categories || [], loading: result.loading, error: result.error, retry: result.retry }; }

export function useProduct(identifier, type) {
  const path = identifier ? `/api/products/${encodeURIComponent(identifier)}${type ? `?type=${encodeURIComponent(type)}` : ""}` : null;
  const [state, setState] = useState({ product: null, loading: true, error: null, notFound: false });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController(); setState({ product: null, loading: true, error: null, notFound: false });
    fetch(path, { signal: controller.signal }).then(async (response) => { const body = await response.json(); if (response.status === 404) return setState({ product: null, loading: false, error: null, notFound: true }); if (!response.ok) throw new Error(body.message || "Request failed"); setState({ product: body.data.product, loading: false, error: null, notFound: false }); }).catch((error) => { if (error.name !== "AbortError") setState({ product: null, loading: false, error: error.message, notFound: false }); });
    return () => controller.abort();
  }, [path]);
  return state;
}
