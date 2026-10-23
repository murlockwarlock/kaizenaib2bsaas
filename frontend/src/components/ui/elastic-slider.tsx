'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import styles from './elastic-slider.module.css';

const MAX_OVERFLOW = 50;

type ElasticSliderProps = {
  defaultValue?: number;
  value?: number;
  onChange?: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  className?: string;
  isStepped?: boolean;
  stepSize?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showValue?: boolean;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function decay(value: number, max: number): number {
  if (max === 0) return 0;

  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
  return sigmoid * max;
}

export default function ElasticSlider({
  defaultValue = 50,
  value,
  onChange,
  minValue = 0,
  maxValue = 100,
  className,
  isStepped = false,
  stepSize = 1,
  leftIcon,
  rightIcon,
  showValue = true,
}: ElasticSliderProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<'left' | 'middle' | 'right'>('middle');
  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);

  const currentValue = isControlled ? value : internalValue;

  useEffect(() => {
    if (!isControlled) {
      setInternalValue(defaultValue);
    }
  }, [defaultValue, isControlled]);

  useMotionValueEvent(clientX, 'change', (latest) => {
    if (!sliderRef.current) return;

    const { left, right } = sliderRef.current.getBoundingClientRect();
    let nextOverflow = 0;

    if (latest < left) {
      setRegion('left');
      nextOverflow = left - latest;
    } else if (latest > right) {
      setRegion('right');
      nextOverflow = latest - right;
    } else {
      setRegion('middle');
    }

    overflow.jump(decay(nextOverflow, MAX_OVERFLOW));
  });

  const opacity = useTransform(scale, [1, 1.2], [0.7, 1]);
  const leftX = useTransform(() => (region === 'left' ? -overflow.get() / scale.get() : 0));
  const rightX = useTransform(() => (region === 'right' ? overflow.get() / scale.get() : 0));
  const trackScaleX = useTransform(() => {
    if (!sliderRef.current) return 1;
    const { width } = sliderRef.current.getBoundingClientRect();
    return 1 + overflow.get() / width;
  });
  const trackScaleY = useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.82]);
  const trackHeight = useTransform(scale, [1, 1.2], [6, 12]);
  const trackMarginTop = useTransform(scale, [1, 1.2], [0, -3]);
  const trackMarginBottom = useTransform(scale, [1, 1.2], [0, -3]);
  const trackOrigin = useTransform(() => {
    if (!sliderRef.current) return 'center';
    const { left, width } = sliderRef.current.getBoundingClientRect();
    return clientX.get() < left + width / 2 ? 'right' : 'left';
  });

  const updateValue = (nextValue: number) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons <= 0 || !sliderRef.current) return;

    const { left, width } = sliderRef.current.getBoundingClientRect();
    let nextValue = minValue + ((event.clientX - left) / width) * (maxValue - minValue);

    if (isStepped) {
      nextValue = Math.round(nextValue / stepSize) * stepSize;
    }

    nextValue = Math.min(Math.max(nextValue, minValue), maxValue);
    updateValue(nextValue);
    clientX.jump(event.clientX);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    handlePointerMove(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = () => {
    animate(overflow, 0, { type: 'spring', bounce: 0.5 });
  };

  const rangePercentage = maxValue === minValue ? 0 : ((currentValue - minValue) / (maxValue - minValue)) * 100;

  return (
    <div className={joinClassNames(styles.container, className)}>
      <motion.div
        onHoverStart={() => animate(scale, 1.2)}
        onHoverEnd={() => animate(scale, 1)}
        onTouchStart={() => animate(scale, 1.2)}
        onTouchEnd={() => animate(scale, 1)}
        style={{ scale, opacity }}
        className={styles.sliderWrapper}
      >
        {leftIcon ? (
          <motion.div
            animate={{ scale: region === 'left' ? [1, 1.3, 1] : 1, transition: { duration: 0.25 } }}
            style={{ x: leftX }}
            className={styles.icon}
          >
            {leftIcon}
          </motion.div>
        ) : null}

        <div
          ref={sliderRef}
          className={styles.sliderRoot}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <motion.div
            className={styles.trackWrapper}
            style={{
              scaleX: trackScaleX,
              scaleY: trackScaleY,
              transformOrigin: trackOrigin,
              height: trackHeight,
              marginTop: trackMarginTop,
              marginBottom: trackMarginBottom,
            }}
          >
            <div className={styles.track}>
              <div className={styles.range} style={{ width: `${rangePercentage}%` }} />
            </div>
          </motion.div>
        </div>

        {rightIcon ? (
          <motion.div
            animate={{ scale: region === 'right' ? [1, 1.3, 1] : 1, transition: { duration: 0.25 } }}
            style={{ x: rightX }}
            className={styles.icon}
          >
            {rightIcon}
          </motion.div>
        ) : null}
      </motion.div>

      {showValue ? <p className={styles.value}>{Math.round(currentValue)}</p> : null}
    </div>
  );
}
