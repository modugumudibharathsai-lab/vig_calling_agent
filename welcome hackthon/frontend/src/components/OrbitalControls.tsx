"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Sliders,
  Clock,
  Radio,
  Zap,
  Play,
  RotateCw,
  Terminal,
  Activity,
} from "lucide-react";

export type AgentInterceptionMode = "MANUAL" | "SCHEDULED" | "DEEP_SHIELD";

interface OrbitalControlsProps {
  mode: AgentInterceptionMode;
  manualEnabled: boolean;
  userStatus: string;
  onToggleMode: (mode: AgentInterceptionMode) => void;
  onToggleManualScreening: (enabled: boolean) => void;
  onChangeUserStatus: (status: string) => void;
  onRunSimulation: (scenario: string) => void;
  isSimulating: boolean;
}

export const OrbitalControls: React.FC<OrbitalControlsProps> = ({
  mode,
  manualEnabled,
  userStatus,
  onToggleMode,
  onToggleManualScreening,
  onChangeUserStatus,
  onRunSimulation,
  isSimulating,
}) => {
  const oscCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Oscilloscope RF Spectrum Bar visualizer
  useEffect(() => {
    const canvas = oscCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const renderSpectrum = () => {
      t += 0.05;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw faint baseline grid
      ctx.strokeStyle = "rgba(40, 50, 70, 0.4)";
      ctx.lineWidth = 0.8;
      for (let y = 10; y < h; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw 32 vertical equalizer/spectrum frequency bars
      const bars = 36;
      const barWidth = w / bars - 2;

      for (let i = 0; i < bars; i++) {
        // Pseudo RF frequency modulation
        const baseHeight = Math.sin(i * 0.35 + t * 2) * 16 + Math.cos(i * 0.7 - t * 3) * 12 + 25;
        const barHeight = Math.max(4, Math.min(h - 4, baseHeight * (isSimulating ? 1.6 : 0.8)));

        const x = i * (barWidth + 2);
        const y = h - barHeight;

        // Gradient based on mode
        let barColor = "#00F0FF";
        if (mode === "DEEP_SHIELD") barColor = "#FF2A55";
        else if (isSimulating) barColor = "#FFB800";

        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Cap dot
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, Math.max(0, y - 2), barWidth, 1.5);
      }

      animId = requestAnimationFrame(renderSpectrum);
    };

    renderSpectrum();
    return () => cancelAnimationFrame(animId);
  }, [mode, isSimulating]);

  return (
    <div className="hud-panel p-5 relative flex flex-col space-y-4">
      {/* Corner Brackets */}
      <div className="corner-bracket corner-cyan-tl" />
      <div className="corner-bracket corner-cyan-tr" />
      <div className="corner-bracket corner-cyan-bl" />
      <div className="corner-bracket corner-cyan-br" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] font-mono tracking-widest text-slate-400">
        <span className="flex items-center gap-1.5 text-cyber-cyan font-bold">
          <Terminal className="w-3.5 h-3.5" />
          INTERCEPT CONTROL INTERFACE // [SUB_04]
        </span>
        <span className="text-slate-500">SYS_V2.9</span>
      </div>

      {/* Cyber-Physical Agent Mode Rotational Selector */}
      <div className="p-3 bg-slate-950/80 border border-slate-800/80 relative">
        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2 flex items-center justify-between">
          <span>TACTICAL AGENT MODE</span>
          <span className="text-hazard-amber font-bold">[{mode}]</span>
        </label>

        {/* 3-Position Cyber Switch */}
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
          <button
            onClick={() => onToggleMode("MANUAL")}
            className={`py-2 px-1 text-[10px] font-bold tracking-tight border transition flex flex-col items-center justify-center gap-1 ${
              mode === "MANUAL"
                ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${mode === "MANUAL" ? "bg-cyber-cyan animate-pulse" : "bg-slate-700"}`} />
            MANUAL
          </button>

          <button
            onClick={() => onToggleMode("SCHEDULED")}
            className={`py-2 px-1 text-[10px] font-bold tracking-tight border transition flex flex-col items-center justify-center gap-1 ${
              mode === "SCHEDULED"
                ? "bg-hazard-amber/15 border-hazard-amber text-hazard-amber shadow-[0_0_10px_rgba(255,184,0,0.2)]"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${mode === "SCHEDULED" ? "bg-hazard-amber animate-pulse" : "bg-slate-700"}`} />
            SCHEDULED
          </button>

          <button
            onClick={() => onToggleMode("DEEP_SHIELD")}
            className={`py-2 px-1 text-[10px] font-bold tracking-tight border transition flex flex-col items-center justify-center gap-1 ${
              mode === "DEEP_SHIELD"
                ? "bg-warning-red/20 border-warning-red text-warning-red shadow-[0_0_12px_rgba(255,42,85,0.3)]"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${mode === "DEEP_SHIELD" ? "bg-warning-red animate-pulse" : "bg-slate-700"}`} />
            DEEP SHIELD
          </button>
        </div>

        {/* Mode Description Tag */}
        <div className="mt-2 text-[9px] font-mono text-slate-400 bg-slate-900/50 p-1.5 border border-slate-800/60">
          {mode === "MANUAL" && "DIRECT ON/OFF CONTROL • INTERCEPT ACTIVE"}
          {mode === "SCHEDULED" && "ORBITAL WINDOW ACTIVE: 09:00 - 17:00 / 22:00 - 07:30"}
          {mode === "DEEP_SHIELD" && "MAX DEFENSE: REJECT ALL UNKNOWN TELEPHONY VECTORS"}
        </div>
      </div>

      {/* Manual Intercept Switch (Cyber-Physical slider) */}
      {mode === "MANUAL" && (
        <div className="p-3 bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-200 block">
              INTERCEPT RELAY COIL
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              {manualEnabled ? "ONLINE • CARRIER HOOK ENGAGED" : "BYPASSED • PASS-THROUGH"}
            </span>
          </div>

          <button
            onClick={() => onToggleManualScreening(!manualEnabled)}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold border transition ${
              manualEnabled
                ? "bg-neon-green/20 border-neon-green text-neon-green shadow-[0_0_8px_rgba(0,255,102,0.3)]"
                : "bg-slate-800 border-slate-700 text-slate-500"
            }`}
          >
            [{manualEnabled ? "ARMED" : "DISARMED"}]
          </button>
        </div>
      )}

      {/* User Operating Vector (Status) */}
      <div className="p-3 bg-slate-950/80 border border-slate-800/80">
        <label className="text-[10px] font-mono text-slate-400 block mb-1.5">
          OPERATOR STATUS VECTOR:
        </label>
        <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
          {["in_meeting", "focus_time", "available", "sleeping", "driving"].map((status) => (
            <button
              key={status}
              onClick={() => onChangeUserStatus(status)}
              className={`py-1 px-1 border uppercase text-center transition ${
                userStatus === status
                  ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan font-bold"
                  : "bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Audio Frequency Oscilloscope */}
      <div className="p-3 bg-slate-950/90 border border-slate-800/80">
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1.5">
          <span className="flex items-center gap-1.5 text-hazard-amber">
            <Activity className="w-3 h-3 text-hazard-amber" />
            RF SPECTRUM OSCILLOSCOPE // 1420.405 MHz
          </span>
          <span className="text-slate-500">32-CH FFT</span>
        </div>
        <div className="h-16 w-full relative">
          <canvas
            ref={oscCanvasRef}
            width={320}
            height={64}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Simulated Intercept Scenario Triggers */}
      <div className="p-3 bg-slate-950/80 border border-slate-800/80 space-y-1.5">
        <span className="text-[10px] font-mono text-slate-400 block mb-1 font-bold">
          [ ] TEST INTERCEPT FLIGHT SIMULATION:
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
          <button
            disabled={isSimulating}
            onClick={() => onRunSimulation("URGENT_FAMILY")}
            className="p-1.5 border border-purple-800/60 bg-purple-950/40 text-purple-200 hover:bg-purple-900/50 text-left transition flex items-center justify-between disabled:opacity-50"
          >
            <span>[A] VIP HOSPITAL</span>
            <Play className="w-2.5 h-2.5 text-purple-400" />
          </button>
          <button
            disabled={isSimulating}
            onClick={() => onRunSimulation("ROBOCALL_SPAM")}
            className="p-1.5 border border-warning-red/60 bg-warning-red/15 text-warning-red hover:bg-warning-red/25 text-left transition flex items-center justify-between disabled:opacity-50"
          >
            <span>[B] IRS SCAMMER</span>
            <Play className="w-2.5 h-2.5 text-warning-red" />
          </button>
          <button
            disabled={isSimulating}
            onClick={() => onRunSimulation("FOOD_DELIVERY")}
            className="p-1.5 border border-hazard-amber/60 bg-hazard-amber/15 text-hazard-amber hover:bg-hazard-amber/25 text-left transition flex items-center justify-between disabled:opacity-50"
          >
            <span>[C] COURIER GATE</span>
            <Play className="w-2.5 h-2.5 text-hazard-amber" />
          </button>
          <button
            disabled={isSimulating}
            onClick={() => onRunSimulation("DOCTOR_CLINIC")}
            className="p-1.5 border border-cyber-cyan/60 bg-cyber-cyan/15 text-cyber-cyan hover:bg-cyber-cyan/25 text-left transition flex items-center justify-between disabled:opacity-50"
          >
            <span>[D] CLINIC CALL</span>
            <Play className="w-2.5 h-2.5 text-cyber-cyan" />
          </button>
        </div>
      </div>
    </div>
  );
};
