'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import styles from './liquid-chrome.module.css';

type ColorTriple = [number, number, number];

type LiquidChromeProps = React.HTMLAttributes<HTMLDivElement> & {
  baseColor?: ColorTriple;
  accentColor?: ColorTriple;
  sheenColor?: ColorTriple;
  speed?: number;
  amplitude?: number;
  frequencyX?: number;
  frequencyY?: number;
  interactive?: boolean;
  antialias?: boolean;
  dprCap?: number;
  renderScale?: number;
  targetFps?: number;
  pauseWhenHidden?: boolean;
  onError?: () => void;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export default function LiquidChrome({
  baseColor = [0.05, 0.07, 0.1],
  accentColor = [1.0, 0.42, 0.29],
  sheenColor = [0.13, 0.78, 0.72],
  speed = 0.24,
  amplitude = 0.42,
  frequencyX = 3.4,
  frequencyY = 2.2,
  interactive = true,
  antialias = false,
  dprCap = 1.25,
  renderScale = 1,
  targetFps = 60,
  pauseWhenHidden = true,
  onError,
  className,
  ...props
}: LiquidChromeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !isAvailable) return undefined;

    const container = containerRef.current;
    let renderer: Renderer;
    let gl: any;
    let program: Program;
    let mesh: Mesh;

    try {
      renderer = new Renderer({
        alpha: true,
        antialias,
        dpr: Math.min(window.devicePixelRatio || 1, dprCap),
      });
      if (!renderer || !renderer.gl || !renderer.gl.canvas) {
        throw new Error('WebGL renderer is unavailable');
      }
      gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);

      const geometry = new Triangle(gl);

      program = new Program(gl, {
        vertex: `
        attribute vec2 position;
        attribute vec2 uv;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `,
      fragment: `
        precision highp float;

        uniform float uTime;
        uniform vec3 uResolution;
        uniform vec3 uBaseColor;
        uniform vec3 uAccentColor;
        uniform vec3 uSheenColor;
        uniform float uAmplitude;
        uniform float uFrequencyX;
        uniform float uFrequencyY;
        uniform vec2 uMouse;

        varying vec2 vUv;

        vec3 palette(float t) {
          return mix(uBaseColor, uAccentColor, smoothstep(0.05, 0.95, t));
        }

        void main() {
          vec2 uv = vUv;
          vec2 centered = uv - 0.5;
          centered.x *= uResolution.z;

          vec2 flow = centered;
          for (float i = 1.0; i < 7.0; i++) {
            flow.x += (uAmplitude / i) * sin(i * uFrequencyX * centered.y + uTime * 0.9);
            flow.y += (uAmplitude / i) * cos(i * uFrequencyY * centered.x - uTime * 0.75);
          }

          vec2 mouse = uMouse - 0.5;
          mouse.x *= uResolution.z;
          vec2 delta = flow - mouse;
          float dist = length(delta);
          float ripple = sin(18.0 * dist - uTime * 2.4) * exp(-dist * 4.5);
          flow += normalize(delta + 0.0001) * ripple * 0.06;

          float streaks = sin(flow.x * 4.0 + uTime * 0.6) * cos(flow.y * 5.5 - uTime * 0.45);
          float rings = sin(length(flow) * 18.0 - uTime * 1.3);
          float energy = 0.5 + 0.5 * streaks;
          float chrome = 0.5 + 0.5 * rings;

          vec3 base = palette(energy);
          vec3 sheen = mix(base, uSheenColor, chrome * 0.6);
          float glow = smoothstep(0.95, 0.15, dist);
          vec3 color = mix(base, sheen, 0.55) + glow * uAccentColor * 0.12;

          float vignette = smoothstep(2.1, 0.55, length(centered));
          color = mix(color, color * vignette, 0.18);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Float32Array([1, 1, 1]) },
        uBaseColor: { value: new Float32Array(baseColor) },
        uAccentColor: { value: new Float32Array(accentColor) },
        uSheenColor: { value: new Float32Array(sheenColor) },
        uAmplitude: { value: amplitude },
        uFrequencyX: { value: frequencyX },
        uFrequencyY: { value: frequencyY },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
      },
      });

      mesh = new Mesh(gl, { geometry, program });
    } catch (error) {
      console.warn('LiquidChrome disabled: unable to create webgl context', error);
      setIsAvailable(false);
      onError?.();
      return undefined;
    }

    function resize() {
      const width = Math.max(container.offsetWidth, 1);
      const height = Math.max(container.offsetHeight, 1);
      const scaledWidth = Math.max(1, Math.round(width * renderScale));
      const scaledHeight = Math.max(1, Math.round(height * renderScale));
      renderer.setSize(scaledWidth, scaledHeight);

      const resolution = program.uniforms.uResolution.value as Float32Array;
      resolution[0] = gl.canvas.width;
      resolution[1] = gl.canvas.height;
      resolution[2] = gl.canvas.width / gl.canvas.height;
    }

    function updatePointer(clientX: number, clientY: number) {
      const rect = container.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = 1 - (clientY - rect.top) / rect.height;
      const mouse = program.uniforms.uMouse.value as Float32Array;
      mouse[0] = Math.max(0, Math.min(1, x));
      mouse[1] = Math.max(0, Math.min(1, y));
    }

    const handleMouseMove = (event: MouseEvent) => updatePointer(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches[0]) updatePointer(event.touches[0].clientX, event.touches[0].clientY);
    };

    let animationId = 0;
    let isRunning = false;
    let lastFrameTime = 0;
    const frameInterval = 1000 / Math.max(1, targetFps);

    const renderFrame = (time: number) => {
      if (!isRunning) return;
      animationId = window.requestAnimationFrame(renderFrame);

      if (time - lastFrameTime < frameInterval) {
        return;
      }

      lastFrameTime = time;
      program.uniforms.uTime.value = time * 0.001 * speed;
      renderer.render({ scene: mesh });
    };

    const stopAnimation = () => {
      if (!isRunning) return;
      isRunning = false;
      window.cancelAnimationFrame(animationId);
      animationId = 0;
    };

    const startAnimation = () => {
      if (isRunning) return;
      isRunning = true;
      animationId = window.requestAnimationFrame(renderFrame);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    resize();
    window.addEventListener('resize', resize);

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
    }

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.className = styles.canvas;
    container.appendChild(canvas);
    startAnimation();

    if (pauseWhenHidden) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      stopAnimation();
      window.removeEventListener('resize', resize);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
      }
      if (pauseWhenHidden) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [accentColor, amplitude, antialias, baseColor, dprCap, frequencyX, frequencyY, interactive, isAvailable, onError, pauseWhenHidden, renderScale, sheenColor, speed, targetFps]);

  if (!isAvailable) {
    return null;
  }

  return <div ref={containerRef} className={joinClassNames(styles.liquidChrome, className)} {...props} />;
}
