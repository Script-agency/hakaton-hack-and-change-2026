import type { PropsWithChildren } from "react";
import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";

export const MotionProvider = ({ children }: PropsWithChildren) => {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
};
