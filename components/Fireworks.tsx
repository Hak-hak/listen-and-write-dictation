import React, { useEffect, useRef } from 'react';

export const Fireworks: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const random = (min: number, max: number) => Math.random() * (max - min) + min;
    let hue = 195;

    class Particle {
      x: number;
      y: number;
      coordinates: [number, number][] = [];
      angle: number;
      speed: number;
      friction = 0.95;
      gravity = 0.9;
      hue: number;
      brightness: number;
      alpha = 1;
      decay: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        for (let i = 0; i < 5; i++) this.coordinates.push([x, y]);
        this.angle = random(0, Math.PI * 2);
        this.speed = random(1.5, 9);
        this.hue = random(hue - 30, hue + 30);
        this.brightness = random(45, 70);
        this.decay = random(0.015, 0.03);
      }

      update(index: number, list: Particle[]) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        this.speed *= this.friction;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;
        this.alpha -= this.decay;
        if (this.alpha <= this.decay) {
          list.splice(index, 1);
        }
      }

      draw(context: CanvasRenderingContext2D) {
        context.beginPath();
        const last = this.coordinates[this.coordinates.length - 1];
        context.moveTo(last[0], last[1]);
        context.lineTo(this.x, this.y);
        context.strokeStyle = `hsla(${this.hue}, 90%, ${this.brightness}%, ${this.alpha})`;
        context.lineWidth = 2;
        context.stroke();
      }
    }

    class Firework {
      x: number;
      y: number;
      sx: number;
      sy: number;
      tx: number;
      ty: number;
      distanceToTarget: number;
      coordinates: [number, number][] = [];
      angle: number;
      speed = 2.5;
      acceleration = 1.05;
      brightness: number;

      constructor(sx: number, sy: number, tx: number, ty: number) {
        this.x = sx;
        this.y = sy;
        this.sx = sx;
        this.sy = sy;
        this.tx = tx;
        this.ty = ty;
        this.distanceToTarget = Math.hypot(tx - sx, ty - sy);
        for (let i = 0; i < 3; i++) this.coordinates.push([sx, sy]);
        this.angle = Math.atan2(ty - sy, tx - sx);
        this.brightness = random(50, 70);
      }

      update(index: number, fireworksList: Firework[], particlesList: Particle[]) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        this.speed *= this.acceleration;
        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;
        const traveled = Math.hypot(this.x + vx - this.sx, this.y + vy - this.sy);
        if (traveled >= this.distanceToTarget) {
          fireworksList.splice(index, 1);
          for (let i = 0; i < 28; i++) {
            particlesList.push(new Particle(this.tx, this.ty));
          }
        } else {
          this.x += vx;
          this.y += vy;
        }
      }

      draw(context: CanvasRenderingContext2D) {
        context.beginPath();
        const last = this.coordinates[this.coordinates.length - 1];
        context.moveTo(last[0], last[1]);
        context.lineTo(this.x, this.y);
        context.strokeStyle = `hsl(${hue}, 90%, ${this.brightness}%)`;
        context.lineWidth = 2;
        context.stroke();
      }
    }

    const fireworks: Firework[] = [];
    const particles: Particle[] = [];

    const loop = () => {
      animationFrameId.current = requestAnimationFrame(loop);
      hue += 0.6;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      if (Math.random() < 0.045) {
        fireworks.push(new Firework(width / 2, height, random(width * 0.15, width * 0.85), random(height * 0.1, height * 0.48)));
      }
      for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update(i, fireworks, particles);
        fireworks[i]?.draw(ctx);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(i, particles);
        particles[i]?.draw(ctx);
      }
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    loop();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-40" />;
};
