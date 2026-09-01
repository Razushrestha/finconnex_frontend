"use client";

import { useCallback, useEffect, useState } from "react";
import { getCrmUserProfile } from "@/lib/user-profile/api";
import { replaceCrmUserProfile, type UserProfile } from "@/lib/user-profile/types";

export type UserProfileSource = "api" | "demo";

export function useCrmUserProfile() {
  const [source, setSource] = useState<UserProfileSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await getCrmUserProfile();
        if (cancelled) return;
        replaceCrmUserProfile(remote);
        setProfile(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setProfile(null);
        setError(err instanceof Error ? err.message : "Profile unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, profile, setProfile, refresh };
}
