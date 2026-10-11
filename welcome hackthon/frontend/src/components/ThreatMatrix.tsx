"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Radio,
  Crosshair,
  Cpu,
  AlertTriangle,
  UserCheck,
  PhoneOff,
  Flame,
  Volume2,
  Terminal,
} from "lucide-react";

export interface StreamData {
  callId: string;
  callerId: string;
  callerName?: string;
  callerCategory?: string;
  transcript: string;
  urgencyScore: number;
  spamRisk: number;
  callState: "IDLE" | "SCREENING" | "TRANSFERRED" | "BLOCKED";
  action: "HANDLE_BY_AGENT" | "TRANSFER_TO_USER" | "BLOCK_SPAM" | "STANDBY";
  agentSpokenResponse?: string;
  reasoning?: string;
  sentiment?: string;
  keyPhrases?: string[];
  reputationSource?: string;
  truecallerSpamScore?: number;
}

interface ThreatMatrixProps {
  streamData: StreamData;
  onForceTransfer: () => void;
  onForceBlock: () => void;
  isConnected: boolean;
}

export const ThreatMatrix: React.FC<ThreatMatrixProps> = ({
  streamData,
  onForceTransfer,
  onForceBlock,
  isConnected,
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tactical Radar Scope Canvas
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const renderRadar = () => {
      angle += 0.04;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) - 4;

      ctx.clearRect(0, 0, w, h);

      // Radar rings
      ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
      ctx.lineWidth = 1;
      [0.3, 0.6, 0.95].forEach((frac) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.stroke();

      // Sweep cone
      const sweepGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      sweepGrad.addColorStop(0, "rgba(0, 240, 255, 0.4)");
      sweepGrad.addColorStop(1, "rgba(0, 240, 255, 0)");

      ctx.save();
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle - 0.5, angle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Blip targets if active
      if (streamData.callState !== "IDLE") {
        const blipColor = streamData.spamRisk > 70 ? "#FF2A55" : "#FFB800";
        ctx.save();
        ctx.fillStyle = blipColor;
        ctx.shadowColor = blipColor;
        ctx.shadowBlur = 8;
        const bx = cx + Math.cos(2.4) * (r * 0.65);
        const by = cy + Math.sin(2.4) * (r * 0.65);
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = blipColor;
        ctx.strokeRect(bx - 6, by - 6, 12, 12);
        ctx.restore();
      }

      animId = requestAnimationFrame(renderRadar);
    };

    renderRadar();
    return () => cancelAnimationFrame(animId);
  }, [streamData.callState, streamData.spamRisk]);

  return (
    <div className="hud-panel p-5 relative flex flex-col space-y-4">
      {/* Corner Brackets */}
      <div className="corner-bracket corner-tl" />
      <div className="corner-bracket corner-tr" />
      <div className="corner-bracket corner-bl" />
      <div className="corner-bracket corner-br" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] font-mono tracking-widest text-slate-400">
        <span className="flex items-center gap-1.5 text-hazard-amber font-bold">
          <ShieldAlert className="w-3.5 h-3.5" />
          THREAT MATRIX & SIGNAL RECON // [SEC_GRID]
        </span>
        <span className="text-slate-500">
          HEX: 0x88F2 // LINK: {isConnected ? "LOCKED" : "DROPPED"}
        </span>
      </div>

      {/* Top Threat Indicators & Radar Scope */}
      <div className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-950/80 border border-slate-800/80">
        {/* Radar Scope */}
        <div className="col-span-4 flex flex-col items-center justify-center">
          <div className="w-24 h-24 relative">
            <canvas
              ref={radarCanvasRef}
              width={100}
              height={100}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[8px] font-mono text-slate-500 mt-1 tracking-tighter">
            RADAR BEARING: 312°
          </span>
        </div>

        {/* Biometric Score Tachometer Dials */}
        <div className="col-span-8 flex flex-col space-y-2.5 font-mono">
          {/* Spam Biometric Score */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Flame className="w-3 h-3 text-warning-red" />
                SPAM BIOMETRIC SCORE:
              </span>
              <span
                className={`font-bold ${
                  streamData.spamRisk > 70
                    ? "text-warning-red animate-pulse"
                    : streamData.spamRisk > 40
                    ? "text-hazard-amber"
                    : "text-neon-green"
                }`}
              >
                {streamData.spamRisk}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 border border-slate-800 overflow-hidden">
              <motion.div
                className={`h-full transition-all duration-300 ${
                  streamData.spamRisk > 70
                    ? "bg-warning-red shadow-[0_0_8px_#FF2A55]"
                    : streamData.spamRisk > 40
                    ? "bg-hazard-amber shadow-[0_0_8px_#FFB800]"
                    : "bg-neon-green"
                }`}
                style={{ width: `${streamData.spamRisk}%` }}
              />
            </div>
          </div>

          {/* Urgency Biometric Score */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-cyber-cyan" />
                CALL URGENCY INDEX:
              </span>
              <span
                className={`font-bold ${
                  streamData.urgencyScore > 70
                    ? "text-hazard-amber"
                    : streamData.urgencyScore > 40
                    ? "text-cyber-cyan"
                    : "text-slate-400"
                }`}
              >
                {streamData.urgencyScore}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 border border-slate-800 overflow-hidden">
              <motion.div
                className={`h-full transition-all duration-300 ${
                  streamData.urgencyScore > 70
                    ? "bg-gradient-to-r from-cyber-cyan to-hazard-amber"
                    : "bg-cyber-cyan"
                }`}
                style={{ width: `${streamData.urgencyScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TRUECALLER DENSITY DATA MATRIX */}
      <div className="p-3 bg-slate-950/80 border border-slate-800/80 font-mono text-[9px] space-y-1.5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 text-slate-400">
          <span className="text-hazard-amber font-bold">
            [ ] TRUECALLER DENSITY DATA & REPUTATION MATRIX:
          </span>
          <span className="text-slate-500">API_REV_4.1</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
          <div>
            <span className="text-slate-500 block">CALLER ID:</span>
            <span className="text-cyber-cyan font-bold">
              {streamData.callerId || "STANDBY // NO CARRIER"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">IDENTITY RECORD:</span>
            <span className="text-slate-200">
              {streamData.callerName || "UNKNOWN ENTITY"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">SECURITY TIER:</span>
            <span
              className={`font-bold uppercase ${
                streamData.callerCategory === "VIP"
                  ? "text-purple-400"
                  : streamData.callerCategory === "BLOCKLIST"
                  ? "text-warning-red"
                  : "text-slate-300"
              }`}
            >
              [{streamData.callerCategory || "UNKNOWN"}]
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">FRAUD COMMUNITY REPORTS:</span>
            <span className="text-warning-red font-bold">
              {streamData.truecallerSpamScore ? `${streamData.truecallerSpamScore * 14} FLAGS` : "0 FLAGS"}
            </span>
          </div>
        </div>
      </div>

      {/* Silent Co-Pilot Real-Time Intercepted Transcript */}
      <div className="p-3 bg-slate-950/95 border border-slate-800/80 flex-1 flex flex-col font-mono text-[10px]">
        <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-2 text-slate-400">
          <span className="flex items-center gap-1.5 text-cyber-cyan">
            <Volume2 className="w-3.5 h-3.5 text-cyber-cyan" />
            SILENT CO-PILOT SPEECH RECON DECODER [ ]
          </span>
          <span className="text-[9px] text-slate-500 uppercase">
            TONE: {streamData.sentiment || "CALM"}
          </span>
        </div>

        <div className="flex-1 min-h-[90px] overflow-y-auto text-slate-200 leading-relaxed pr-1">
          {streamData.transcript ? (
            <p className="text-slate-100 whitespace-pre-wrap">
              &gt; {streamData.transcript}
            </p>
          ) : (
            <div className="text-slate-600 italic py-4 text-center">
              Awaiting telephony RF transmission packets...
            </div>
          )}
        </div>

        {/* Telemetry Trigger Vector Pills */}
        {streamData.keyPhrases && streamData.keyPhrases.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-900">
            {streamData.keyPhrases.map((phrase, i) => (
              <span
                key={i}
                className="text-[8px] px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-hazard-amber uppercase"
              >
                #{phrase}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Autonomous AI Response Protocol */}
      <div className="p-3 bg-slate-950/80 border border-slate-800/80 font-mono text-[10px]">
        <div className="flex items-center justify-between mb-1 text-slate-400">
          <span className="flex items-center gap-1 text-slate-300 font-bold">
            <Cpu className="w-3.5 h-3.5 text-hazard-amber" />
            AUTONOMOUS COUNTER-SPEECH PROTOCOL:
          </span>
          <span
            className={`px-2 py-0.5 text-[9px] font-bold border uppercase ${
              streamData.action === "TRANSFER_TO_USER"
                ? "bg-neon-green/20 border-neon-green text-neon-green"
                : streamData.action === "BLOCK_SPAM"
                ? "bg-warning-red/20 border-warning-red text-warning-red"
                : streamData.action === "HANDLE_BY_AGENT"
                ? "bg-hazard-amber/20 border-hazard-amber text-hazard-amber"
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
          >
            [{streamData.action || "STANDBY"}]
          </span>
        </div>

        <p className="text-slate-300 italic text-[10px] mt-1">
          &gt; {streamData.agentSpokenResponse || "System in passive monitor mode."}
        </p>
      </div>

      {/* Tactical Manual Override Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 font-mono">
        <button
          onClick={onForceTransfer}
          disabled={streamData.callState === "IDLE"}
          className="p-2 border border-neon-green/50 bg-neon-green/10 text-neon-green hover:bg-neon-green/20 text-[9px] font-bold uppercase transition flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <UserCheck className="w-3 h-3" />
          [ FORCE DIRECT LINE BYPASS ]
        </button>

        <button
          onClick={onForceBlock}
          disabled={streamData.callState === "IDLE"}
          className="p-2 border border-warning-red/50 bg-warning-red/10 text-warning-red hover:bg-warning-red/20 text-[9px] font-bold uppercase transition flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PhoneOff className="w-3 h-3" />
          [ EMERGENCY TERMINATE & SHIELD ]
        </button>
      </div>
    </div>
  );
};
