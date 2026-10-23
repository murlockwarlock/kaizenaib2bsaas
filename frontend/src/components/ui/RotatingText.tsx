'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  motion,
  AnimatePresence,
  type Transition,
  type VariantLabels,
  type Target,
  type TargetAndTransition,
} from 'framer-motion';
import styles from './RotatingText.module.css';

function cn(...classes: Array<string | undefined | null | boolean>) {
  return classes.filter(Boolean).join(' ');
}

export interface RotatingTextRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

export interface RotatingTextProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof motion.span>,
    'children' | 'transition' | 'initial' | 'animate' | 'exit'
  > {
  texts: string[];
  transition?: Transition;
  initial?: boolean | Target | VariantLabels;
  animate?: boolean | VariantLabels | TargetAndTransition;
  exit?: Target | VariantLabels;
  animatePresenceMode?: 'sync' | 'wait';
  animatePresenceInitial?: boolean;
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: 'first' | 'last' | 'center' | 'random' | number;
  loop?: boolean;
  auto?: boolean;
  splitBy?: string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>((props, ref) => {
  const {
    texts,
    transition = { type: 'spring', damping: 25, stiffness: 300 },
    initial = { y: '100%', opacity: 0 },
    animate = { y: 0, opacity: 1 },
    exit = { y: '-120%', opacity: 0 },
    animatePresenceMode = 'wait',
    animatePresenceInitial = false,
    rotationInterval = 2000,
    staggerDuration = 0,
    staggerFrom = 'first',
    loop = true,
    auto = true,
    splitBy = 'characters',
    onNext,
    mainClassName,
    splitLevelClassName,
    elementLevelClassName,
    ...rest
  } = props;

  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const splitIntoCharacters = (text: string) => {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text), (segment) => segment.segment);
    }

    return Array.from(text);
  };

  const elements = useMemo(() => {
    const currentText = texts[currentTextIndex];

    if (splitBy === 'characters') {
      const words = currentText.split(' ');
      return words.map((word, index) => ({
        characters: splitIntoCharacters(word),
        needsSpace: index !== words.length - 1,
      }));
    }

    if (splitBy === 'words') {
      return currentText.split(' ').map((word, index, array) => ({
        characters: [word],
        needsSpace: index !== array.length - 1,
      }));
    }

    if (splitBy === 'lines') {
      return currentText.split('\n').map((line, index, array) => ({
        characters: [line],
        needsSpace: index !== array.length - 1,
      }));
    }

    return currentText.split(splitBy).map((part, index, array) => ({
      characters: [part],
      needsSpace: index !== array.length - 1,
    }));
  }, [currentTextIndex, splitBy, texts]);

  const getStaggerDelay = useCallback(
    (index: number, totalChars: number) => {
      if (staggerFrom === 'first') return index * staggerDuration;
      if (staggerFrom === 'last') return (totalChars - 1 - index) * staggerDuration;
      if (staggerFrom === 'center') {
        const center = Math.floor(totalChars / 2);
        return Math.abs(center - index) * staggerDuration;
      }
      if (staggerFrom === 'random') {
        const randomIndex = Math.floor(Math.random() * totalChars);
        return Math.abs(randomIndex - index) * staggerDuration;
      }

      return Math.abs(staggerFrom - index) * staggerDuration;
    },
    [staggerDuration, staggerFrom]
  );

  const handleIndexChange = useCallback(
    (newIndex: number) => {
      setCurrentTextIndex(newIndex);
      onNext?.(newIndex);
    },
    [onNext]
  );

  const next = useCallback(() => {
    const nextIndex = currentTextIndex === texts.length - 1 ? (loop ? 0 : currentTextIndex) : currentTextIndex + 1;

    if (nextIndex !== currentTextIndex) {
      handleIndexChange(nextIndex);
    }
  }, [currentTextIndex, handleIndexChange, loop, texts.length]);

  const previous = useCallback(() => {
    const previousIndex = currentTextIndex === 0 ? (loop ? texts.length - 1 : currentTextIndex) : currentTextIndex - 1;

    if (previousIndex !== currentTextIndex) {
      handleIndexChange(previousIndex);
    }
  }, [currentTextIndex, handleIndexChange, loop, texts.length]);

  const jumpTo = useCallback(
    (index: number) => {
      const validIndex = Math.max(0, Math.min(index, texts.length - 1));

      if (validIndex !== currentTextIndex) {
        handleIndexChange(validIndex);
      }
    },
    [currentTextIndex, handleIndexChange, texts.length]
  );

  const reset = useCallback(() => {
    if (currentTextIndex !== 0) {
      handleIndexChange(0);
    }
  }, [currentTextIndex, handleIndexChange]);

  useImperativeHandle(
    ref,
    () => ({
      next,
      previous,
      jumpTo,
      reset,
    }),
    [jumpTo, next, previous, reset]
  );

  useEffect(() => {
    if (!auto || texts.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(next, rotationInterval);
    return () => window.clearInterval(intervalId);
  }, [auto, next, rotationInterval, texts.length]);

  return (
    <motion.span className={cn(styles.root, mainClassName)} {...rest} layout transition={transition}>
      <span className={styles.screenReader}>{texts[currentTextIndex]}</span>
      <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
        <motion.span
          key={currentTextIndex}
          className={cn(splitBy === 'lines' ? styles.lines : styles.root)}
          layout
          aria-hidden="true"
        >
          {elements.map((wordObj, wordIndex, array) => {
            const previousCharsCount = array.slice(0, wordIndex).reduce((sum, word) => sum + word.characters.length, 0);
            const totalChars = array.reduce((sum, word) => sum + word.characters.length, 0);

            return (
              <span key={wordIndex} className={cn(styles.word, splitLevelClassName)}>
                {wordObj.characters.map((char, charIndex) => (
                  <motion.span
                    key={`${char}-${charIndex}`}
                    initial={initial}
                    animate={animate}
                    exit={exit}
                    transition={{
                      ...transition,
                      delay: getStaggerDelay(previousCharsCount + charIndex, totalChars),
                    }}
                    className={cn(styles.element, elementLevelClassName)}
                  >
                    {char}
                  </motion.span>
                ))}
                {wordObj.needsSpace ? <span className={styles.space}> </span> : null}
              </span>
            );
          })}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
});

RotatingText.displayName = 'RotatingText';

export default RotatingText;
