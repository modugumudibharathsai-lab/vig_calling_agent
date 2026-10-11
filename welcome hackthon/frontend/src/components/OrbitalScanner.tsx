"use client";

import React, { useEffect, useRef } from "react";
import { Disc, Radio, ShieldAlert, CheckCircle2 } from "lucide-react";

export interface OrbitalScannerProps {
  callState?: "IDLE" | "SCREENING" | "TRANSFERRED" | "BLOCKED";
  urgencyScore?: number;
  spamRisk?: number;
  callerId?: string;
}

export const OrbitalScanner: React.FC<OrbitalScannerProps> = ({
  callState = "IDLE",
  urgencyScore = 0,
  spamRisk = 0,
  callerId = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Orbiting particle nodes
    const particleCount = 120;
    const particles = Array.from({ length: particleCount }, () => {
      const radius = 40 + Math.random() * 110;
      const speed = (0.015 + Math.random() * 0.025) * (Math.random() > 0.5 ? 1 : -1);
      return {
        radius,
        angle: Math.random() * Math.PI * 2,
        speed,
        size: 0.8 + Math.random() * 1.8,
        pulseOffset: Math.random() * Math.PI * 2,
      };
    });

    const render = () => {
      time += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Color scheme based on tactical state:
      // Obsidian (#050507), Hazard (#FFB800), Crimson (#FF2A55)
      let primaryColor = "#00F0FF";  // Cyan standby
      let secondaryColor = "#FFB800"; // Hazard
      let speedMult = 1.0;
      let waveAmp = 8;

      if (callState === "SCREENING") {
        primaryColor = "#FFB800";    // Hazard
        secondaryColor = "#FF8000";
        speedMult = 2.2;
        waveAmp = 18;
      } else if (callState === "BLOCKED") {
        primaryColor = "#FF2A55";    // Crimson
        secondaryColor = "#990022";
        speedMult = 3.0;
        waveAmp = 24;
      } else if (callState === "TRANSFERRED") {
        primaryColor = "#00FF66";    // Neon Green
        secondaryColor = "#00F0FF";
        speedMult = 1.4;
        waveAmp = 12;
      }

      // 1. Concentric Rings
      const ringRadii = [35, 70, 105, 140];
      ringRadii.forEach((r, idx) => {
        ctx.save();
        ctx.strokeStyle = idx % 2 === 1 ? primaryColor : "rgba(80, 100, 130, 0.35)";
        ctx.lineWidth = idx === 1 ? 1.5 : 1;
        ctx.globalAlpha = idx === 1 ? 0.7 : 0.4;
        if (idx === 2) ctx.setLineDash([4, 6]);

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 2. Crosshair Grid Lines
      ctx.save();
      ctx.strokeStyle = "rgba(70, 90, 120, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(cx - 150, cy);
      ctx.lineTo(cx + 150, cy);
      ctx.moveTo(cx, cy - 150);
      ctx.lineTo(cx, cy + 150);
      ctx.stroke();
      ctx.restore();

      // 3. Rotating Audio Radar Sweep
      ctx.save();
      const sweepAngle = time * 1.2 * speedMult;
      const sweepGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 145);
      sweepGrad.addColorStop(0, primaryColor);
      sweepGrad.addColorStop(0.7, "transparent");

      ctx.fillStyle = sweepGrad;
      ctx.globalAlpha = callState === "SCREENING" ? 0.25 : 0.12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 145, sweepAngle - 0.5, sweepAngle);
      ctx.closePath();
      ctx.fill();

      // Leading beam edge
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * 145, cy + Math.sin(sweepAngle) * 145);
      ctx.stroke();
      ctx.restore();

      // 4. Undulating Audio Frequency Waveform Perimeter
      ctx.save();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 10;
      const baseOuterR = 145;
      const segments = 96;

      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const wave = Math.sin(theta * 8 + time * 3 * speedMult) * waveAmp;
        const currentR = baseOuterR + wave;
        const x = cx + Math.cos(theta) * currentR;
        const y = cy + Math.sin(theta) * currentR;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // 5. Central Anomaly / Core
      const coreR = 25 + Math.sin(time * 3 * speedMult) * 3;
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreR);
      coreGrad.addColorStop(0, "#050507");
      coreGrad.addColorStop(0.6, primaryColor);
      coreGrad.addColorStop(1, "transparent");

      ctx.save();
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6. Orbiting Particle Nodes
      particles.forEach((p) => {
        p.angle += p.speed * speedMult;
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius;

        ctx.save();
        ctx.fillStyle = primaryColor;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 7. Tactical Azimuth Text
      ctx.save();
      ctx.fillStyle = "rgba(160, 180, 210, 0.6)";
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("000° [N]", cx, cy - 155);
      ctx.fillText("090° [E]", cx + 160, cy);
      ctx.fillText("180° [S]", cx, cy + 160);
      ctx.fillText("270° [W]", cx - 160, cy);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [callState, urgencyScore, spamRisk]);

  return (
    <div className="hud-panel p-4 relative overflow-hidden flex flex-col items-center justify-center">
      {/* Corner hazard brackets */}
      <div className="corner-bracket corner-tl" />
      <div className="corner-bracket corner-tr" />
      <div className="corner-bracket corner-bl" />
      <div className="corner-bracket corner-br" />

      {/* Header */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-400 border-b border-slate-800 pb-2 mb-2">
        <span className="flex items-center gap-1.5 text-hazard font-bold">
          <Disc className="w-3.5 h-3.5 animate-spin" />
          ORBITAL SCANNER // RADAR AUDIO SWEEP
        </span>
        <span className="text-slate-500">CONCENTRIC 4-RING SCOPE</span>
      </div>

      {/* Canvas */}
      <div className="relative w-[320px] h-[320px] flex items-center justify-center my-1">
        <canvas
          ref={canvasRef}
          width={340}
          height={340}
          className="w-full h-full object-contain"
        />

        {/* Center overlay label */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 bg-obsidian/90 border border-slate-700/60 rounded text-slate-300">
            {callState}
          </span>
        </div>
      </div>

      {/* Status banner */}
      <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400">CARRIER: {callerId || "STANDBY"}</span>
        <span
          className={`font-bold ${
            callState === "BLOCKED"
              ? "text-crimson"
              : callState === "SCREENING"
              ? "text-hazard"
              : callState === "TRANSFERRED"
              ? "text-neon-green"
              : "text-cyber-cyan"
          }`}
        >
          [{callState}]
        </span>
      </div>
    </div>
  );
};

export default OrbitalScanner;
