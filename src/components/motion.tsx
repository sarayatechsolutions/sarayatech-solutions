import { createContext, forwardRef, useContext, useEffect, useState, type ReactNode } from "react";
import { motion as framerMotion, MotionConfig, useReducedMotion } from "framer-motion";

/**
 * Entrance animations must never hide content on first paint (STS-022).
 *
 * framer-motion renders an element's `initial` state into the HTML, so a section with
 * `initial={{ opacity: 0 }}` is blank in the prerendered page, for crawlers, for no-JS
 * visitors and until hydration. This module's `motion` is a drop-in for framer-motion's:
 * it ignores `initial` (renders the final state) while the app is being prerendered or
 * hydrated, and for visitors who prefer reduced motion. Components that mount after
 * hydration, such as a page opened by client-side navigation, animate in as designed.
 */
const EntranceContext = createContext(false);

/** Wrap the app once, inside the router-independent providers. */
export const MotionProvider = ({ children }: { children: ReactNode }) => {
  // false on the server and on the hydration render, true once the app is mounted.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <EntranceContext.Provider value={ready}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </EntranceContext.Provider>
  );
};

// Members of framer-motion's `motion` that are not element tags.
const PASSTHROUGH = new Set(["create", "custom", "then", "displayName", "prototype"]);

const wrappers = new Map<string, unknown>();

function wrap(tag: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Base = (framerMotion as any)[tag];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Wrapped = forwardRef<unknown, any>((props, ref) => {
    const entranceReady = useContext(EntranceContext);
    const reduceMotion = useReducedMotion();
    const showFinalState = !entranceReady || reduceMotion;
    return <Base ref={ref} {...props} initial={showFinalState ? false : props.initial} />;
  });
  Wrapped.displayName = `motion.${tag}`;
  return Wrapped;
}

/** Same API and types as framer-motion's `motion`. */
export const motion = new Proxy(framerMotion, {
  get(target, key, receiver) {
    if (typeof key !== "string" || PASSTHROUGH.has(key)) return Reflect.get(target, key, receiver);
    if (!wrappers.has(key)) wrappers.set(key, wrap(key));
    return wrappers.get(key);
  },
}) as typeof framerMotion;
