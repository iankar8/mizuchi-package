
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MotionContainerProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  animation?: "fade-in" | "scale-in" | "slide-in-right" | "slide-in-up";
}

export const MotionContainer = ({
  children,
  delay = 0,
  className,
  animation = "fade-in",
}: MotionContainerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px 50px 0px"
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [delay]);

  const getAnimationClasses = () => {
    switch (animation) {
      case "fade-in":
        return "animate-fade-in";
      case "scale-in":
        return "animate-scale-in";
      case "slide-in-right":
        return "animate-slide-in-right";
      case "slide-in-up":
        return "animate-slide-in-up";
      default:
        return "animate-fade-in";
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "opacity-0",
        isVisible && getAnimationClasses(),
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  );
};

export default MotionContainer;
