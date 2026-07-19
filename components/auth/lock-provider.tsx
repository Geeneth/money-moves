"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface LockContextValue {
  locked: boolean;
  passwordSet: boolean;
  unlock: () => void;
  lock: () => void;
  refreshStatus: () => Promise<void>;
}

const LockContext = createContext<LockContextValue>({
  locked: false,
  passwordSet: false,
  unlock: () => {},
  lock: () => {},
  refreshStatus: async () => {},
});

export function useLock(): LockContextValue {
  return useContext(LockContext);
}

export function LockProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [passwordSet, setPasswordSet] = useState(false);
  const [locked, setLocked] = useState(false);
  const initialised = useRef(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const json = await res.json() as { data: { passwordSet: boolean } };
      const isSet = json.data.passwordSet;
      setPasswordSet(isSet);
      if (!initialised.current) {
        // Lock on first load only if a password is configured
        setLocked(isSet);
        initialised.current = true;
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const unlock = useCallback(() => setLocked(false), []);
  const lock = useCallback(() => {
    if (passwordSet) setLocked(true);
  }, [passwordSet]);

  return (
    <LockContext.Provider value={{ locked, passwordSet, unlock, lock, refreshStatus }}>
      {children}
    </LockContext.Provider>
  );
}
