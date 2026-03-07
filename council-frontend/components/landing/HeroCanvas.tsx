"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#E8734A", "#ef4444", "#10b981", "#64748b"];
const NUM_PARTICLES = 60;
const REPEL_RADIUS = 180;
const CONNECT_RADIUS = 130;
const CONNECT_RADIUS_SQ = CONNECT_RADIUS * CONNECT_RADIUS;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animId: number;
    // Use device pixel ratio for sharpness but cap at 2 to limit fill-rate
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener("resize", resize);
    resize();

    const particles: Particle[] = Array.from({ length: NUM_PARTICLES }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 1.5 + 0.8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const mouse = { x: width / 2, y: height / 2, active: false };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // ── Connection lines (batched, no sqrt) ────────────────────────────
      ctx.lineWidth = 1;
      for (let i = 0; i < NUM_PARTICLES; i++) {
        for (let j = i + 1; j < NUM_PARTICLES; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < CONNECT_RADIUS_SQ) {
            const alpha = 0.10 - (distSq / CONNECT_RADIUS_SQ) * 0.10;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(150,160,200,${alpha})`;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // ── Particles (no shadowBlur — use larger radius for glow) ─────────
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < REPEL_RADIUS * REPEL_RADIUS) {
            const dist = Math.sqrt(distSq);
            p.x -= (dx / dist) * 1.5;
            p.y -= (dy / dist) * 1.5;
          }
        } else {
          p.x += (width / 2 - p.x) * 0.0003;
          p.y += (height / 2 - p.y) * 0.0003;
        }

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Soft glow (cheap radial gradient instead of shadowBlur)
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 5);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full absolute inset-0 z-0 cursor-crosshair"
    />
  );
}
