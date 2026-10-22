import { useEffect, useRef } from "react";

/** Guard event-handler continuations after navigation. Reads also use effect cleanup. */
export function usePageActive() {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return active;
}
