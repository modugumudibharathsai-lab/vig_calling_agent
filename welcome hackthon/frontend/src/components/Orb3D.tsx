"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, PhoneForwarded, Radio, ShieldAlert } from "lucide-react";

export type CallState = "IDLE" | "SCREENING" | "TRANSFERRED" | "BLOCKED";

interface Orb3DProps {
  state: CallState;
  urgencyScore: number;
  spamRisk: number;
}

export const Orb3D: React.FC<Orb3DProps> = ({ state, urgencyScore, spamRisk }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Particle constellation configuration
    const particleCount = 75;
    const particles: { angle: number; radius: number; speed: number; size: number; phase: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 65 + Math.random() * 55,
        speed: (0.005 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1),
        size: 1.2 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      time += 0.025;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Color paletting based on Call State
      let coreColor1 = "rgba(99, 102, 241, 0.9)"; // Indigo
      let coreColor2 = "rgba(168, 85, 247, 0.5)"; // Purple
      let ringColor = "rgba(139, 92, 246, 0.4)";
      let particleColor = "rgba(192, 132, 252, 0.8)";
      let pulseSpeed = 1.0;
      let waveAmpl = 8;

      if (state === "SCREENING") {
        coreColor1 = "rgba(245, 158, 11, 0.95)"; // Amber gold
        coreColor2 = "rgba(234, 88, 12, 0.6)";  // Orange
        ringColor = "rgba(251, 191, 36, 0.5)";
        particleColor = "rgba(253, 224, 71, 0.9)";
        pulseSpeed = 2.4;
        waveAmpl = 18;
      } else if (state === "TRANSFERRED") {
        coreColor1 = "rgba(16, 185, 129, 0.95)"; // Emerald
        coreColor2 = "rgba(5, 150, 105, 0.6)";  // Teal
        ringColor = "rgba(52, 211, 153, 0.55)";
        particleColor = "rgba(110, 231, 183, 0.95)";
        pulseSpeed = 1.5;
        waveAmpl = 12;
      } else if (state === "BLOCKED") {
        coreColor1 = "rgba(239, 68, 68, 0.95)";  // Crimson Red
        coreColor2 = "rgba(185, 28, 28, 0.7)";  // Dark Ruby
        ringColor = "rgba(248, 113, 113, 0.6)";
        particleColor = "rgba(252, 165, 165, 0.9)";
        pulseSpeed = 3.0;
        waveAmpl = 22;
      }

      // 1. Draw outer ambient atmospheric glow
      const ambientRadius = 135 + Math.sin(time * pulseSpeed) * 10;
      const ambientGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, coreColor1);
      ambientGrad.addColorStop(0.5, coreColor2);
      ambientGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ambientRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric audio-reactive revolving rings
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        ctx.save();
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.8 - r * 0.4;
        ctx.beginPath();

        const baseRingR = 75 + r * 24;
        const ringPoints = 64;
        for (let p = 0; p <= ringPoints; p++) {
          const theta = (p / ringPoints) * Math.PI * 2;
          // Harmonic wave distortion
          const noise = Math.sin(theta * (4 + r) + time * (2 + r) * (state === "SCREENING" ? 1.5 : 1)) *
                        (state === "BLOCKED" ? (Math.random() > 0.8 ? waveAmpl * 1.5 : waveAmpl) : waveAmpl);
          const currentR = baseRingR + noise;
          const px = cx + Math.cos(theta) * currentR;
          const py = cy + Math.sin(theta) * currentR;

          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // 3. Central 3D sphere with shading
      const sphereRadius = 52 + Math.sin(time * pulseSpeed * 1.2) * 4;
      const sphereGrad = ctx.createRadialGradient(
        cx - sphereRadius * 0.3,
        cy - sphereRadius * 0.3,
        4,
        cx,
        cy,
        sphereRadius
      );
      sphereGrad.addColorStop(0, "#ffffff");
      sphereGrad.addColorStop(0.35, coreColor1);
      sphereGrad.addColorStop(0.8, coreColor2);
      sphereGrad.addColorStop(1, "rgba(5, 7, 15, 0.95)");

      ctx.save();
      ctx.shadowColor = coreColor1;
      ctx.shadowBlur = 30;
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Orbiting particle swarm
      particles.forEach((p) => {
        p.angle += p.speed * (state === "SCREENING" ? 2.2 : 1.0);
        const dynamicR = p.radius + Math.sin(time + p.phase) * (state === "BLOCKED" ? 14 : 6);
        const px = cx + Math.cos(p.angle) * dynamicR;
        const py = cy + Math.sin(p.angle) * (dynamicR * 0.75); // slight 3D isometric tilt

        ctx.fillStyle = particleColor;
        ctx.shadowColor = particleColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, urgencyScore, spamRisk]);

  // Status icon & banner helpers
  const getStateMeta = () => {
    switch (state) {
      case "SCREENING":
        return {
          title: "AI AGENT ACTIVE SCREENING",
          subtitle: "Analyzing audio stream & evaluating caller intention",
          badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/20",
          icon: <Radio className="w-4 h-4 animate-spin-slow text-amber-400" />,
        };
      case "TRANSFERRED":
        return {
          title: "CALL TRANSFERRED TO USER",
          subtitle: "Urgent emergency verified or VIP priority bypass granted",
          badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20",
          icon: <PhoneForwarded className="w-4 h-4 text-emerald-400 animate-pulse" />,
        };
      case "BLOCKED":
        return {
          title: "SPAM CALL BLOCKED",
          subtitle: "High fraudulent risk detected • Telemetry recorded",
          badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/20",
          icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
        };
      default:
        return {
          title: "AI CALL AGENT STANDBY",
          subtitle: "Watching incoming PSTN & Android call lines",
          badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-indigo-500/20",
          icon: <ShieldCheck className="w-4 h-4 text-indigo-400" />,
        };
    }
  };

  const meta = getStateMeta();

  return (
    <div className="relative flex flex-col items-center justify-center p-6 glass-panel rounded-2xl overflow-hidden group">
      {/* Dynamic Background Glow */}
      <div
        className={`absolute -inset-1 rounded-2xl blur-xl opacity-30 transition-all duration-700 pointer-events-none ${
          state === "SCREENING"
            ? "bg-amber-500"
            : state === "TRANSFERRED"
            ? "bg-emerald-500"
            : state === "BLOCKED"
            ? "bg-rose-600"
            : "bg-indigo-600"
        }`}
      />

      {/* 3D Canvas Visualizer */}
      <div className="relative w-[340px] h-[340px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(99,102,241,0.25)]"
        />

        {/* Floating Core Badge Overlay */}
        <div className="absolute bottom-2 inset-x-0 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={state}
            className={`px-3 py-1 rounded-full border text-xs font-semibold tracking-wider flex items-center space-x-2 backdrop-blur-md shadow-lg ${meta.badgeClass}`}
          >
            {meta.icon}
            <span>{state}</span>
          </motion.div>
        </div>
      </div>

      {/* Orb Status Banner */}
      <div className="mt-4 text-center z-10">
        <h3 className="text-lg font-bold text-white tracking-wide flex items-center justify-center gap-2">
          {meta.title}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">{meta.subtitle}</p>
      </div>
    </div>
  );
};
