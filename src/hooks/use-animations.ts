import { useInView } from "framer-motion";
import { useRef } from "react";

/**
 * Hook to trigger animations when element comes into view
 */
export const useScrollAnimation = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "0px 0px -100px 0px",
  });

  return { ref, isInView };
};

/**
 * Hook for delayed animation chains
 */
export const useStaggerAnimation = (delay: number = 0.1) => {
  const getDelay = (index: number) => index * delay;

  return { getDelay };
};

/**
 * Hook for element entrance animations
 */
export const useEntranceAnimation = (triggerOnce: boolean = true) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: triggerOnce,
    margin: "0px 0px -50px 0px",
  });

  return { ref, isInView };
};

/**
 * Hook for hover animations with state
 */
export const useHoverAnimation = () => {
  const ref = useRef<HTMLDivElement>(null);

  return { ref };
};

/**
 * Hook for scroll-triggered fade in animations
 */
export const useScrollFadeIn = (threshold: number = 0.2) => {
  const ref = useRef<HTMLDivElement>(null);
  const offset = -threshold * 100;
  const isInView = useInView(ref, {
    once: true,
    margin: `0px 0px ${offset}px 0px`,
  });

  return { ref, isInView };
};
