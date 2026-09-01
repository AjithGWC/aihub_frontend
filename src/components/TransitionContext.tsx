import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

const TransitionContext = createContext<{
  isTransitioning: boolean;
  startTransition: (toPath: string) => void;
}>({
  isTransitioning: false,
  startTransition: () => {},
});

export const useTransition = () => useContext(TransitionContext);

export const TransitionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const navigate = useNavigate();

  const startTransition = (toPath: string) => {
    setShowOverlay(true);
    setIsTransitioning(true);

    setTimeout(() => {
      const tiles = document.querySelectorAll(".global-tile-block");
      if (tiles.length === 0) {
        navigate(toPath);
        setIsTransitioning(false);
        setShowOverlay(false);
        return;
      }

      // 1. Force reset tiles to initial state (flipped back)
      gsap.killTweensOf(tiles);
      gsap.set(tiles, { rotateY: -90, opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          setIsTransitioning(false);
          setShowOverlay(false);
        }
      });

      // 2. Roll in: Staggered flip from left-to-right (curtain closing)
      tl.to(tiles, {
        rotateY: 0,
        opacity: 1,
        duration: 0.4,
        ease: "power2.inOut",
        stagger: {
          grid: [12, 12],
          from: "start",
          axis: "x",
          amount: 0.5
        }
      });

      // 3. Navigation: Switch route while the screen is fully covered
      tl.add(() => {
        navigate(toPath);
      });

      // 4. Roll out: Staggered flip from left-to-right (curtain opening) to reveal the new page
      tl.to(tiles, {
        rotateY: 90,
        opacity: 0,
        duration: 0.45,
        ease: "power2.inOut",
        delay: 0.12, // Short hold to allow the React component to mount smoothly underneath
        stagger: {
          grid: [12, 12],
          from: "start",
          axis: "x",
          amount: 0.5
        }
      });
    }, 50);
  };

  return (
    <TransitionContext.Provider value={{ isTransitioning, startTransition }}>
      {children}
      {showOverlay && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto flex flex-col bg-transparent">
          <div 
            style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(12, 1fr)", 
              gridTemplateRows: "repeat(12, 1fr)", 
              width: "100vw", 
              height: "100vh",
              perspective: "1000px"
            }}
            className="gap-0"
          >
            {Array.from({ length: 144 }).map((_, i) => (
              <div
                key={i}
                className="global-tile-block bg-[#f5f7fb] border border-[#2563eb]/10 origin-center"
                style={{ 
                  opacity: 0, 
                  transform: "rotateY(-90deg)",
                  backfaceVisibility: "hidden"
                }}
              />
            ))}
          </div>
        </div>
      )}
    </TransitionContext.Provider>
  );
};
