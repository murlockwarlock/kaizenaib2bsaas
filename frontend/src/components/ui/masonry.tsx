'use client';

import React, { ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

type MasonryDirection = 'top' | 'bottom' | 'left' | 'right' | 'center';

type MasonryRenderArgs<T> = {
  item: T;
  index: number;
  width: number;
  height: number;
};

type MasonryProps<T> = {
  items: T[];
  gap?: number;
  animateFrom?: MasonryDirection;
  duration?: number;
  stagger?: number;
  className?: string;
  getItemKey: (item: T, index: number) => string | number;
  getItemHeight: (item: T, columnWidth: number, index: number) => number;
  renderItem: (args: MasonryRenderArgs<T>) => ReactNode;
};

type MeasuredSize = {
  width: number;
  height: number;
};

type Position = {
  x: number;
  y: number;
};

type LayoutItem<T> = {
  item: T;
  index: number;
  key: string | number;
  x: number;
  y: number;
  w: number;
  h: number;
};

const MEDIA_QUERIES = ['(min-width: 1500px)', '(min-width: 1000px)', '(min-width: 700px)', '(min-width: 420px)'];
const MEDIA_VALUES = [5, 4, 3, 2];

function useMedia(queries: string[], values: number[], defaultValue: number) {
  const getValue = useCallback(() => {
    if (typeof window === 'undefined') return defaultValue;
    const queryIndex = queries.findIndex((query) => window.matchMedia(query).matches);
    return values[queryIndex] ?? defaultValue;
  }, [defaultValue, queries, values]);

  const [value, setValue] = useState(getValue);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQueries = queries.map((query) => window.matchMedia(query));
    const onChange = () => setValue(getValue());

    mediaQueries.forEach((mediaQuery) => mediaQuery.addEventListener('change', onChange));
    return () => mediaQueries.forEach((mediaQuery) => mediaQuery.removeEventListener('change', onChange));
  }, [getValue, queries]);

  return value;
}

function useMeasure(): [React.RefObject<HTMLDivElement | null>, MeasuredSize] {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<MeasuredSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

function getInitialPosition(
  item: Pick<LayoutItem<unknown>, 'x' | 'y' | 'w' | 'h'>,
  containerSize: Pick<MeasuredSize, 'width' | 'height'>,
  direction: MasonryDirection
): Position {
  if (!containerSize.width || typeof window === 'undefined') {
    return { x: item.x, y: item.y + 80 };
  }

  switch (direction) {
    case 'top':
      return { x: item.x, y: -item.h - 80 };
    case 'bottom':
      return { x: item.x, y: window.innerHeight + item.h };
    case 'left':
      return { x: -item.w - 80, y: item.y };
    case 'right':
      return { x: window.innerWidth + item.w, y: item.y };
    case 'center':
      return {
        x: containerSize.width / 2 - item.w / 2,
        y: Math.max(containerSize.height / 2 - item.h / 2, 0),
      };
    default:
      return { x: item.x, y: item.y + 100 };
  }
}

export default function Masonry<T>({
  items,
  gap = 16,
  animateFrom = 'bottom',
  duration = 0.6,
  stagger = 0.05,
  className,
  getItemKey,
  getItemHeight,
  renderItem,
}: MasonryProps<T>) {
  const columns = useMedia(MEDIA_QUERIES, MEDIA_VALUES, 1);
  const [containerRef, containerSize] = useMeasure();
  const { width } = containerSize;

  const { layoutItems, containerHeight } = useMemo(() => {
    if (!width) return { layoutItems: [] as LayoutItem<T>[], containerHeight: 0 };

    const normalizedColumns = Math.max(columns, 1);
    const totalGap = gap * (normalizedColumns - 1);
    const columnWidth = (width - totalGap) / normalizedColumns;
    const columnHeights = new Array(normalizedColumns).fill(0);

    const nextItems = items.map((item, index) => {
      const columnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      const x = (columnWidth + gap) * columnIndex;
      const itemHeight = getItemHeight(item, columnWidth, index);
      const y = columnHeights[columnIndex];

      columnHeights[columnIndex] += itemHeight + gap;

      return {
        item,
        index,
        key: getItemKey(item, index),
        x,
        y,
        w: columnWidth,
        h: itemHeight,
      };
    });

    const tallestColumn = Math.max(...columnHeights, 0);
    return {
      layoutItems: nextItems,
      containerHeight: Math.max(tallestColumn - gap, 0),
    };
  }, [columns, gap, getItemHeight, getItemKey, items, width]);

  return (
    <div ref={containerRef} className={className}>
      <div className="relative w-full" style={{ height: containerHeight }}>
        {layoutItems.map((layoutItem) => {
          const initialPosition = getInitialPosition(layoutItem, containerSize, animateFrom);

          return (
            <motion.div
              key={layoutItem.key}
              className="absolute left-0 top-0 will-change-transform"
              initial={{
                opacity: 0,
                x: initialPosition.x,
                y: initialPosition.y,
                width: layoutItem.w,
                height: layoutItem.h,
                filter: 'blur(8px)',
              }}
              animate={{
                opacity: 1,
                x: layoutItem.x,
                y: layoutItem.y,
                width: layoutItem.w,
                height: layoutItem.h,
                filter: 'blur(0px)',
              }}
              transition={{
                duration,
                delay: Math.min(layoutItem.index * stagger, 0.45),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {renderItem({
                item: layoutItem.item,
                index: layoutItem.index,
                width: layoutItem.w,
                height: layoutItem.h,
              })}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
