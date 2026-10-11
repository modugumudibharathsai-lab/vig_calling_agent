"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Radio, ShieldAlert, CheckCircle2, Crosshair, Disc } from "lucide-react";

export type CallState = "IDLE" | "SCREENING" | "TRANSFERRED" | "BLOCKED";

interface OrbitalScannerProps {
  state: CallState;
  urgencyScore: number;
  spamRisk: number;
  callerId?: string;
}

export const OrbitalScannerCanvas: React.FC<OrbitalScannerProps> = ({
  state,
  urgencyScore,
  spamRisk,
  callerId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Particle nodes in Keplerian orbits
    const particleCount = 180;
    const particles = Array.from({ length: particleCount }, () => {
      const radius = 55 + Math.pow(Math.random(), 1.5) * 115;
      // Keplerian speed: closer nodes orbit significantly faster
      const baseSpeed = 0.08 / Math.sqrt(radius);
      return {
        radius,
        angle: Math.random() * Math.PI * 2,
        speed: baseSpeed * (Math.random() > 0.4 ? 1 : -1) * (0.8 + Math.random() * 0.4),
        size: 0.9 + Math.random() * 2.1,
        z: (Math.random() - 0.5) * 35,
        pulseOffset: Math.random() * Math.PI * 2,
      };
    });

    const render = () => {
      time += 0.028;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Color paletting for cyber-industrial HUD
      let primaryGlow = "#00F0FF";       // Cyan
      let secondaryGlow = "#00FF66";     // Neon Green
      let anomalyColor = "rgba(0, 240, 255, 0.15)";
      let speedMult = 1.0;
      let waveAmp = 9;

      if (state === "SCREENING") {
        primaryGlow = "#FFB800";         // Hazard Amber
        secondaryGlow = "#FF8000";       // Deep Orange
        anomalyColor = "rgba(255, 184, 0, 0.28)";
        speedMult = 2.4;
        waveAmp = 19;
      } else if (state === "TRANSFERRED") {
        primaryGlow = "#00FF66";         // Neon Green
        secondaryGlow = "#00F0FF";
        anomalyColor = "rgba(0, 255, 102, 0.25)";
        speedMult = 1.3;
        waveAmp = 14;
      } else if (state === "BLOCKED") {
        primaryGlow = "#FF2A55";         // Warning Red
        secondaryGlow = "#990022";
        anomalyColor = "rgba(255, 42, 85, 0.35)";
        speedMult = 3.2;
        waveAmp = 26;
      }

      // 1. Draw Radar Grid Lines & Reticle Crosshairs
      ctx.save();
      ctx.strokeStyle = "rgba(80, 95, 120, 0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - 180, cy);
      ctx.lineTo(cx + 180, cy);
      ctx.moveTo(cx, cy - 180);
      ctx.lineTo(cx, cy + 180);
      ctx.stroke();

      // Diagonal ticks
      ctx.beginPath();
      ctx.moveTo(cx - 120, cy - 120);
      ctx.lineTo(cx + 120, cy + 120);
      ctx.moveTo(cx + 120, cy - 120);
      ctx.lineTo(cx - 120, cy + 120);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2. Concentric Orbital Tracking Rings
      const ringRadii = [48, 85, 125, 160];
      ringRadii.forEach((r, idx) => {
        ctx.save();
        ctx.strokeStyle = idx === 1 || idx === 3 ? primaryGlow : "rgba(80, 100, 130, 0.35)";
        ctx.globalAlpha = idx === 1 ? 0.6 : 0.3;
        ctx.lineWidth = idx === 1 ? 1.5 : 1;
        if (idx % 2 === 1) {
          ctx.setLineDash([3, 5]);
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 3. Rotating Azimuth Compass Sweep
      ctx.save();
      const sweepAngle = time * 0.9 * speedMult;
      const sweepGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 175);
      sweepGrad.addColorStop(0, primaryGlow);
      sweepGrad.addColorStop(0.8, "transparent");

      ctx.fillStyle = sweepGrad;
      ctx.globalAlpha = state === "SCREENING" ? 0.18 : 0.08;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 175, sweepAngle - 0.45, sweepAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 4. Undulating Glowing Sine-Wave Frequency Border
      ctx.save();
      ctx.strokeStyle = primaryGlow;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = primaryGlow;
      ctx.shadowBlur = 12;

      const outerBaseR = 175;
      const numWavePoints = 128;
      ctx.beginPath();
      for (let i = 0; i <= numWavePoints; i++) {
        const theta = (i / numWavePoints) * Math.PI * 2;
        // Dual harmonic audio modulation
        const wave1 = Math.sin(theta * 12 + time * 4 * speedMult);
        const wave2 = Math.cos(theta * 6 - time * 2);
        const jitter = (state === "BLOCKED" && Math.random() > 0.8) ? (Math.random() - 0.5) * 15 : 0;
        const currentR = outerBaseR + (wave1 * 0.7 + wave2 * 0.3) * waveAmp + jitter;

        const x = cx + Math.cos(theta) * currentR;
        const y = cy + Math.sin(theta) * currentR;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // 5. Central Dark Anomaly (Gravity Well / Event Horizon)
      const anomalyR = 40 + Math.sin(time * 2 * speedMult) * 4;
      const holeGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, anomalyR);
      holeGrad.addColorStop(0, "#000000");
      holeGrad.addColorStop(0.5, "#030408");
      holeGrad.addColorStop(0.85, anomalyColor);
      holeGrad.addColorStop(1, primaryGlow);

      ctx.save();
      ctx.shadowColor = primaryGlow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, anomalyR, 0, Math.PI * 2);
      ctx.fill();

      // Accretion Disk Ring
      ctx.strokeStyle = secondaryGlow;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, anomalyR + 8, anomalyR * 0.45, time * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 6. Keplerian Orbital Particle Nodes
      particles.forEach((p) => {
        p.angle += p.speed * speedMult;
        const pulse = Math.sin(time * 3 + p.pulseOffset) * 2;
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius + p.z * 0.4;

        ctx.save();
        ctx.fillStyle = p.radius < 90 ? primaryGlow : secondaryGlow;
        ctx.shadowColor = primaryGlow;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.6, p.size + pulse * 0.3), 0, Math.PI * 2);
        ctx.fill();

        // High speed tachyon particle tracer tails when SCREENING or BLOCKED
        if (state === "SCREENING" || state === "BLOCKED") {
          ctx.strokeStyle = primaryGlow;
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(px, py);
          const tailX = cx + Math.cos(p.angle - p.speed * 4) * p.radius;
          const tailY = cy + Math.sin(p.angle - p.speed * 4) * p.radius;
          ctx.lineTo(tailX, tailY);
          ctx.stroke();
        }
        ctx.restore();
      });

      // 7. Tactical Azimuth Degree Markers
      ctx.save();
      ctx.fillStyle = "rgba(140, 160, 190, 0.7)";
      ctx.font = "8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("000° [NORTH]", cx, cy - 192);
      ctx.fillText("090° [EAST]", cx + 196, cy);
      ctx.fillText("180° [SOUTH]", cx, cy + 192);
      ctx.fillText("270° [WEST]", cx - 196, cy);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [state, urgencyScore, spamRisk]);

  const getStateBadge = () => {
    switch (state) {
      case "SCREENING":
        return {
          label: "ORBITAL INTERCEPTOR: SCREENING ACTIVE",
          sub: "DEEP SPECTRAL DECOMPOSITION // CARRIER ACQUIRED",
          color: "text-hazard-amber border-hazard-amber/60 bg-hazard-amber/10",
          icon: <Radio className="w-3.5 h-3.5 animate-spin text-hazard-amber" />,
        };
      case "TRANSFERRED":
        return {
          label: "INTERCEPT RESOLVED: TRANSFERRED TO USER",
          sub: "DIRECT LINE OPEN // VIP PROTOCOL VERIFIED",
          color: "text-neon-green border-neon-green/60 bg-neon-green/10",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-neon-green animate-pulse" />,
        };
      case "BLOCKED":
        return {
          label: "DEFENSE GRID ENGAGED: THREAT NEUTRALIZED",
          sub: "SPAM CLASSIFIED // LINE CARRIER TERMINATED",
          color: "text-warning-red border-warning-red/60 bg-warning-red/10",
          icon: <ShieldAlert className="w-3.5 h-3.5 text-warning-red animate-pulse" />,
        };
      default:
        return {
          label: "GRAVITATIONAL RADAR: ACTIVE PATROL",
          sub: "WAITING FOR TELEPHONY SIGNAL RF ENTRY",
          color: "text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10",
          icon: <Crosshair className="w-3.5 h-3.5 text-cyber-cyan" />,
        };
    }
  };

  const badge = getStateBadge();

  return (
    <div className="hud-panel p-5 relative overflow-hidden flex flex-col items-center justify-center">
      {/* Hazard Brackets */}
      <div className="corner-bracket corner-tl" />
      <div className="corner-bracket corner-tr" />
      <div className="corner-bracket corner-bl" />
      <div className="corner-bracket corner-br" />

      {/* Technical Header Strip */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-400 border-b border-slate-800 pb-2 mb-2">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Disc className="w-3.5 h-3.5 text-hazard-amber animate-spin" />
          GRAVITATIONAL WELL & AUDIO WAVEFORM SCANNER
        </span>
        <span className="text-slate-500">AZ: 274° // EL: +42° // FL-8</span>
      </div>

      {/* HTML5 Canvas Container */}
      <div className="relative w-[380px] h-[380px] flex items-center justify-center my-2">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full object-contain"
        />

        {/* Central Tactical Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-24 h-24 border border-slate-700/40 rounded-full flex items-center justify-center">
            <span className="text-[8px] font-mono text-slate-500 tracking-tighter">
              {state}
            </span>
          </div>
        </div>
      </div>

      {/* Status HUD Banner */}
      <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex flex-col items-center text-center">
        <div
          className={`px-3 py-1 rounded-sm border text-[11px] font-mono font-bold tracking-wider flex items-center space-x-2 ${badge.color}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </div>
        <p className="text-[10px] font-mono text-slate-500 mt-1">
          {badge.sub}
        </p>
      </div>

      {/* Telemetry Footnote */}
      <div className="w-full mt-3 flex items-center justify-between text-[9px] font-mono text-slate-600">
        <span>RF BUFFER: 99.4%</span>
        <span>DSP LATENCY: 1.8ms</span>
        <span>CARRIER: {callerId || "STANDBY"}</span>
      </div>
    </div>
  );
};
