"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "motion/react";
import type { Card } from "@/lib/types";
import GameCard from "./GameCard";
import { vibrate } from "@/lib/store";

const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 450;

export default function CardStack({
  cards,
  position,
  total,
  canSwipe,
  onSwiped,
}: {
  /** Current card first, then the next ones (up to 3 used). */
  cards: Card[];
  position: number;
  total: number;
  canSwipe: boolean;
  onSwiped: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-11, 11]);
  const leaving = useRef(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const power = Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY;
    if (power && canSwipe && !leaving.current) {
      leaving.current = true;
      const dir = info.offset.x >= 0 ? 1 : -1;
      vibrate(20);
      animate(x, dir * (window.innerWidth + 200), {
        type: "spring",
        stiffness: 200,
        damping: 30,
        velocity: info.velocity.x,
      }).then(() => {
        onSwiped();
        x.jump(0);
        y.jump(0);
        leaving.current = false;
      });
      animate(y, info.offset.y + dir * 40, { type: "spring", stiffness: 200, damping: 30 });
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
      animate(y, 0, { type: "spring", stiffness: 500, damping: 32 });
      if (power && !canSwipe) vibrate([15, 40, 15]);
    }
  };

  const [front, ...behind] = cards;

  return (
    <div className="relative h-full w-full" style={{ perspective: 1200 }}>
      {/* back cards */}
      {behind
        .slice(0, 2)
        .reverse()
        .map((card, i) => {
          const depth = Math.min(behind.length, 2) - i; // 2 = deepest
          return (
            <motion.div
              key={card.id}
              className="absolute inset-0"
              initial={false}
              animate={{
                scale: 1 - depth * 0.045,
                y: depth * 14,
                filter: `brightness(${1 - depth * 0.14})`,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <GameCard card={card} index={position + (behind.length - i)} total={total} />
            </motion.div>
          );
        })}

      {/* front card */}
      {front && (
        <motion.div
          key={front.id}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{ x, y, rotate }}
          drag
          dragElastic={canSwipe ? 0.9 : 0.15}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          initial={{ scale: 0.955, y: 14, filter: "brightness(0.86)" }}
          animate={{ scale: 1, y: 0, filter: "brightness(1)" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <GameCard card={front} index={position} total={total} />
        </motion.div>
      )}
    </div>
  );
}
