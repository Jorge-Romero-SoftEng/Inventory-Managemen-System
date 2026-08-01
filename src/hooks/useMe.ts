"use client";

import { useEffect, useState } from "react";

export interface Me {
  id: number;
  name: string;
  email: string | null;
  role: string | null;
  roleId: number | null;
  active: boolean;
  policies: string[];
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return me;
}
