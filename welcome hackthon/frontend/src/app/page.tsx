"use client";

import React, { useState, useEffect, useRef } from "react";
import { OrbitalScanner } from "@/components/OrbitalScanner";
import {
  ShieldAlert,
  Radio,
  Sliders,
  Terminal,
  Volume2,
  Cpu,
  UserCheck,
  PhoneOff,
  Crosshair,
  Flame,
  Activity,
  Disc,
  Clock,
  Play,
  CheckCircle2,
} from "lucide-react";

const BACKEND_HTTP = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
const BACKEND_WS = process.env.NEXT_PUBLIC_BACKEND_URL
  ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/^http/, "ws")
  : "ws://127.0.0.1:8000";

export default function OrbitalHudPage() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [callState, setCallState] = useState<"IDLE" | "SCREENING" | "TRANSFERRED" | "BLOCKED">("IDLE");
  const [mode, setMode] = useState<"MANUAL" | "SCHEDULED" | "DEEP_SHIELD">("MANUAL");
  const [manualEnabled, setManualEnabled] = useState<boolean>(true);
  const [userStatus, setUserStatus] = useState<string>("in_meeting");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [timeString, setTimeString] = useState<string>("");

  const [streamData, setStreamData] = useState({
    callId: "",
    callerId: "",
    callerName: "",
    callerCategory: "UNKNOWN",
    transcript: "",
    urgencyScore: 0,
    spamRisk: 0,
    action: "STANDBY",
    agentSpokenResponse: "",
    reasoning: "",
    sentiment: "calm",
    keyPhrases: [] as string[],
    truecallerSpamScore: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const oscCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live military clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toTimeString().split(" ")[0] + "." + Math.floor(now.getMilliseconds() / 100));
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  // Mini Radar Scope Canvas
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

      // Blip target
      if (callState !== "IDLE") {
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
        ctx.restore();
      }

      animId = requestAnimationFrame(renderRadar);
    };

    renderRadar();
    return () => cancelAnimationFrame(animId);
  }, [callState, streamData.spamRisk]);

  // Mini Oscilloscope Spectrum Canvas
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

      const bars = 24;
      const barWidth = w / bars - 2;

      for (let i = 0; i < bars; i++) {
        const baseHeight = Math.sin(i * 0.4 + t * 2) * 12 + Math.cos(i * 0.8 - t * 3) * 10 + 20;
        const barHeight = Math.max(3, Math.min(h - 3, baseHeight * (isSimulating ? 1.5 : 0.7)));
        const x = i * (barWidth + 2);
        const y = h - barHeight;

        let barColor = "#00F0FF";
        if (mode === "DEEP_SHIELD") barColor = "#FF2A55";
        else if (isSimulating) barColor = "#FFB800";

        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animId = requestAnimationFrame(renderSpectrum);
    };

    renderSpectrum();
    return () => cancelAnimationFrame(animId);
  }, [mode, isSimulating]);

  // WebSocket Connection to Backend
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connectWs = () => {
      try {
        const socket = new WebSocket(`${BACKEND_WS}/ws/calls/dashboard`);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
          console.log("[HUD WS] Connected.");
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleIncomingMessage(msg);
          } catch (err) {
            console.error("[HUD WS] Parse error:", err);
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        socket.onerror = (err) => {
          socket.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectWs, 3000);
      }
    };

    connectWs();
    fetchSettings();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleIncomingMessage = (msg: any) => {
    if (msg.type === "CALL_INITIATED") {
      setCallState("SCREENING");
      setStreamData((prev) => ({
        ...prev,
        callId: msg.call_id,
        callerId: msg.caller_id,
        transcript: "ACQUIRING CARRIER SPEECH PACKETS...",
        urgencyScore: 15,
        spamRisk: 10,
        action: "HANDLE_BY_AGENT",
      }));
    } else if (msg.type === "STREAM_UPDATE") {
      const state = msg.call_state || "SCREENING";
      setCallState(state);
      setStreamData((prev) => ({
        ...prev,
        callId: msg.call_id || prev.callId,
        callerId: msg.caller_id || prev.callerId,
        callerName: msg.caller_name || prev.callerName,
        transcript: msg.chunk,
        urgencyScore: msg.urgency_score ?? prev.urgencyScore,
        spamRisk: msg.spam_risk ?? prev.spamRisk,
        action: msg.action || prev.action,
        agentSpokenResponse: msg.agent_spoken_response || prev.agentSpokenResponse,
        reasoning: msg.reasoning || prev.reasoning,
        sentiment: msg.meta?.sentiment || prev.sentiment,
        keyPhrases: msg.meta?.key_phrases || prev.keyPhrases,
      }));
    } else if (msg.type === "CALL_DECISION") {
      const d = msg.data;
      setCallState(d.call_state || "IDLE");
      setStreamData({
        callId: d.call_id,
        callerId: d.caller_id,
        callerName: d.caller_name,
        callerCategory: d.caller_category,
        transcript: d.meta?.intent_summary || streamData.transcript,
        urgencyScore: d.urgency_score,
        spamRisk: d.spam_risk,
        action: d.action,
        agentSpokenResponse: d.agent_spoken_response,
        reasoning: d.reasoning,
        sentiment: d.meta?.sentiment || "calm",
        keyPhrases: d.meta?.key_phrases || [],
        truecallerSpamScore: d.meta?.truecaller_spam_score || 0,
      });
      setIsSimulating(false);
    } else if (msg.type === "MANUAL_OVERRIDE") {
      setCallState(msg.call_state || "IDLE");
      setStreamData((prev) => ({
        ...prev,
        action: msg.action,
        reasoning: msg.reasoning,
      }));
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_HTTP}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setMode(data.settings.mode === "SCHEDULED" ? "SCHEDULED" : "MANUAL");
        setManualEnabled(data.settings.manual_screening_enabled);
        setUserStatus(data.settings.user_status);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleToggleMode = async (newMode: "MANUAL" | "SCHEDULED" | "DEEP_SHIELD") => {
    setMode(newMode);
    try {
      await fetch(`${BACKEND_HTTP}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: newMode === "SCHEDULED" ? "SCHEDULED" : "MANUAL",
          manual_screening_enabled: newMode !== "DEEP_SHIELD" ? manualEnabled : true,
          user_status: userStatus,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleManual = async (enabled: boolean) => {
    setManualEnabled(enabled);
    try {
      await fetch(`${BACKEND_HTTP}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: mode === "SCHEDULED" ? "SCHEDULED" : "MANUAL",
          manual_screening_enabled: enabled,
          user_status: userStatus,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeStatus = async (status: string) => {
    setUserStatus(status);
    try {
      await fetch(`${BACKEND_HTTP}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: mode === "SCHEDULED" ? "SCHEDULED" : "MANUAL",
          manual_screening_enabled: manualEnabled,
          user_status: status,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunSimulation = async (scenario: string) => {
    setIsSimulating(true);
    setCallState("SCREENING");
    try {
      await fetch(`${BACKEND_HTTP}/api/simulate-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
    } catch (e) {
      setIsSimulating(false);
    }
  };

  const handleForceTransfer = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "FORCE_TRANSFER", call_id: streamData.callId }));
    }
  };

  const handleForceBlock = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "FORCE_BLOCK", call_id: streamData.callId }));
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-slate-200 font-mono select-none relative overflow-x-hidden">
      {/* CRT Scanline Beam & Grid Mask */}
      <div className="crt-overlay fixed inset-0 z-40 pointer-events-none" />
      <div className="crt-beam z-40 pointer-events-none" />

      {/* Top Telemetry Strip */}
      <header className="border-b border-slate-800 bg-[#07090e]/95 px-6 py-2.5 flex flex-wrap items-center justify-between z-30 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border border-hazard bg-hazard/15 flex items-center justify-center text-hazard">
            <Disc className="w-3.5 h-3.5 animate-spin" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-widest text-slate-100 uppercase flex items-center gap-2">
              ANTIGRAVITY // ORBITAL CALL INTERCEPTOR [4-COLUMN HUD]
            </h1>
            <p className="text-[9px] text-slate-500">
              AUTONOMOUS DEFENSE PROTOCOL • PSTN / TWILIO / ANDROID HOOK
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center space-x-3 text-[10px]">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 border border-slate-800 bg-slate-900/80">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-neon-green animate-pulse" : "bg-crimson"}`} />
            <span className="text-slate-300">{isConnected ? "ONLINE" : "OFFLINE"}</span>
          </div>

          <div className="px-2 py-0.5 border border-slate-800 bg-slate-900/80 text-cyber-cyan">
            STATUS: [{userStatus.toUpperCase().replace("_", " ")}]
          </div>

          <div className="px-2 py-0.5 border border-hazard/40 bg-hazard/10 text-hazard font-bold">
            <Clock className="w-3 h-3 inline mr-1" />
            {timeString || "00:00:00"}
          </div>
        </div>
      </header>

      {/* 4-COLUMN TACTICAL HUD GRID */}
      <main className="p-4 max-w-[1800px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        
        {/* ========================================================
            COLUMN 1: AGENT MODE TOGGLE & TACTICAL CONTROLS
        ======================================================== */}
        <section className="hud-panel p-4 flex flex-col space-y-4">
          <div className="corner-bracket corner-cyan-tl" />
          <div className="corner-bracket corner-cyan-tr" />
          <div className="corner-bracket corner-cyan-bl" />
          <div className="corner-bracket corner-cyan-br" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5 text-cyber-cyan font-bold">
              <Sliders className="w-3.5 h-3.5" />
              AGENT MODE CONTROLS [ ]
            </span>
            <span className="text-slate-500">COL_01</span>
          </div>

          {/* Mode Selector */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800">
            <label className="text-[10px] text-slate-400 uppercase block mb-1.5 flex items-center justify-between">
              <span>INTERCEPT MODE</span>
              <span className="text-hazard font-bold">[{mode}]</span>
            </label>
            <div className="grid grid-cols-3 gap-1 text-[9px]">
              <button
                onClick={() => handleToggleMode("MANUAL")}
                className={`py-1.5 border font-bold ${
                  mode === "MANUAL"
                    ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                MANUAL
              </button>
              <button
                onClick={() => handleToggleMode("SCHEDULED")}
                className={`py-1.5 border font-bold ${
                  mode === "SCHEDULED"
                    ? "bg-hazard/15 border-hazard text-hazard"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                SCHEDULED
              </button>
              <button
                onClick={() => handleToggleMode("DEEP_SHIELD")}
                className={`py-1.5 border font-bold ${
                  mode === "DEEP_SHIELD"
                    ? "bg-crimson/20 border-crimson text-crimson"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                DEEP SHIELD
              </button>
            </div>
          </div>

          {/* Manual Relay Switch */}
          {mode === "MANUAL" && (
            <div className="p-2.5 bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[10px]">
              <div>
                <span className="font-bold text-slate-200 block">RELAY COIL</span>
                <span className="text-[9px] text-slate-500">
                  {manualEnabled ? "ONLINE • INTERCEPTING" : "BYPASS PASS-THROUGH"}
                </span>
              </div>
              <button
                onClick={() => handleToggleManual(!manualEnabled)}
                className={`px-2.5 py-1 text-[9px] font-bold border ${
                  manualEnabled
                    ? "bg-neon-green/20 border-neon-green text-neon-green"
                    : "bg-slate-800 border-slate-700 text-slate-500"
                }`}
              >
                [{manualEnabled ? "ARMED" : "DISARMED"}]
              </button>
            </div>
          )}

          {/* Operator Status */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 text-[10px]">
            <span className="text-slate-400 block mb-1">OPERATOR STATUS:</span>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              {["in_meeting", "available", "focus_time", "sleeping"].map((st) => (
                <button
                  key={st}
                  onClick={() => handleChangeStatus(st)}
                  className={`py-1 border uppercase text-center ${
                    userStatus === st
                      ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Mini Equalizer Canvas */}
          <div className="p-2.5 bg-slate-950/90 border border-slate-800">
            <span className="text-[9px] text-hazard flex items-center gap-1 mb-1">
              <Activity className="w-3 h-3" />
              RF SPECTRUM OSCILLOSCOPE // 1420 MHz
            </span>
            <canvas ref={oscCanvasRef} width={260} height={45} className="w-full object-cover" />
          </div>

          {/* Test Flight Simulator Triggers */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 space-y-1 text-[9px]">
            <span className="text-slate-400 font-bold block mb-1">[ ] SIMULATION LAUNCH:</span>
            <div className="grid grid-cols-2 gap-1">
              <button
                disabled={isSimulating}
                onClick={() => handleRunSimulation("URGENT_FAMILY")}
                className="p-1 border border-purple-800/60 bg-purple-950/40 text-purple-200 hover:bg-purple-900/50 flex items-center justify-between disabled:opacity-50"
              >
                <span>[A] VIP ER</span>
                <Play className="w-2.5 h-2.5 text-purple-400" />
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleRunSimulation("ROBOCALL_SPAM")}
                className="p-1 border border-crimson/60 bg-crimson/15 text-crimson hover:bg-crimson/25 flex items-center justify-between disabled:opacity-50"
              >
                <span>[B] IRS SCAM</span>
                <Play className="w-2.5 h-2.5 text-crimson" />
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleRunSimulation("FOOD_DELIVERY")}
                className="p-1 border border-hazard/60 bg-hazard/15 text-hazard hover:bg-hazard/25 flex items-center justify-between disabled:opacity-50"
              >
                <span>[C] COURIER</span>
                <Play className="w-2.5 h-2.5 text-hazard" />
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleRunSimulation("DOCTOR_CLINIC")}
                className="p-1 border border-cyber-cyan/60 bg-cyber-cyan/15 text-cyber-cyan hover:bg-cyber-cyan/25 flex items-center justify-between disabled:opacity-50"
              >
                <span>[D] CLINIC</span>
                <Play className="w-2.5 h-2.5 text-cyber-cyan" />
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================
            COLUMN 2: SILENT CO-PILOT TERMINAL FEED
        ======================================================== */}
        <section className="hud-panel p-4 flex flex-col space-y-3">
          <div className="corner-bracket corner-tl" />
          <div className="corner-bracket corner-tr" />
          <div className="corner-bracket corner-bl" />
          <div className="corner-bracket corner-br" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5 text-cyber-cyan font-bold">
              <Volume2 className="w-3.5 h-3.5 text-cyber-cyan" />
              SILENT CO-PILOT TERMINAL [ ]
            </span>
            <span className="text-[9px] text-slate-500 uppercase">
              TONE: {streamData.sentiment}
            </span>
          </div>

          {/* Call Session Tag */}
          <div className="p-2 bg-slate-950/80 border border-slate-800 text-[10px] flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[9px]">TARGET LINE:</span>
              <span className="text-slate-100 font-bold">{streamData.callerName || "Awaiting Carrier"}</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 border border-slate-700 bg-slate-900 text-slate-300">
              {streamData.callerId || "STANDBY"}
            </span>
          </div>

          {/* Raw Speech-to-Text Terminal */}
          <div className="p-3 bg-slate-950/95 border border-slate-800/90 flex-1 flex flex-col min-h-[180px] text-[10px]">
            <span className="text-[9px] text-slate-500 pb-1 mb-1 border-b border-slate-900 block">
              // LIVE AUDIO DEMODULATION FEED:
            </span>
            <div className="flex-1 overflow-y-auto pr-1 text-slate-100 leading-relaxed font-mono">
              {streamData.transcript ? (
                <p className="whitespace-pre-wrap">&gt; {streamData.transcript}</p>
              ) : (
                <div className="text-slate-600 italic py-6 text-center">
                  Listening for telephony carrier audio packets...
                </div>
              )}
            </div>

            {/* Keyword Pills */}
            {streamData.keyPhrases.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-900">
                {streamData.keyPhrases.map((phrase, i) => (
                  <span key={i} className="text-[8px] px-1 py-0.2 bg-slate-900 border border-slate-700 text-hazard uppercase">
                    #{phrase}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Spoken AI Counter-Reply */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 text-[10px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300 font-bold flex items-center gap-1">
                <Cpu className="w-3 h-3 text-hazard" />
                AI SPOKEN PROTOCOL:
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 border uppercase font-bold ${
                  streamData.action === "TRANSFER_TO_USER"
                    ? "bg-neon-green/20 border-neon-green text-neon-green"
                    : streamData.action === "BLOCK_SPAM"
                    ? "bg-crimson/20 border-crimson text-crimson"
                    : streamData.action === "HANDLE_BY_AGENT"
                    ? "bg-hazard/20 border-hazard text-hazard"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                [{streamData.action}]
              </span>
            </div>
            <p className="text-slate-300 italic text-[9px]">
              &gt; {streamData.agentSpokenResponse || "System in passive monitor mode."}
            </p>
          </div>
        </section>

        {/* ========================================================
            COLUMN 3: ORBITALSCANNER COMPONENT (CENTER)
        ======================================================== */}
        <section className="flex flex-col">
          <OrbitalScanner
            callState={callState}
            urgencyScore={streamData.urgencyScore}
            spamRisk={streamData.spamRisk}
            callerId={streamData.callerId}
          />
        </section>

        {/* ========================================================
            COLUMN 4: THREAT MATRIX SIDEBAR
        ======================================================== */}
        <section className="hud-panel p-4 flex flex-col space-y-3">
          <div className="corner-bracket corner-tl" />
          <div className="corner-bracket corner-tr" />
          <div className="corner-bracket corner-bl" />
          <div className="corner-bracket corner-br" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5 text-hazard font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              THREAT MATRIX SIDEBAR [ ]
            </span>
            <span className="text-slate-500">COL_04</span>
          </div>

          {/* Radar Scope & Biometrics */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 flex items-center space-x-3">
            <div className="w-16 h-16 relative flex-shrink-0">
              <canvas ref={radarCanvasRef} width={64} height={64} className="w-full h-full object-contain" />
            </div>

            <div className="flex-1 space-y-2 text-[10px]">
              {/* Spam Meter */}
              <div>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 text-crimson" /> SPAM SCORE:
                  </span>
                  <span className={`font-bold ${streamData.spamRisk > 70 ? "text-crimson animate-pulse" : "text-hazard"}`}>
                    {streamData.spamRisk}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${streamData.spamRisk > 70 ? "bg-crimson" : "bg-hazard"}`}
                    style={{ width: `${streamData.spamRisk}%` }}
                  />
                </div>
              </div>

              {/* Urgency Meter */}
              <div>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Crosshair className="w-2.5 h-2.5 text-cyber-cyan" /> URGENCY:
                  </span>
                  <span className="font-bold text-cyber-cyan">{streamData.urgencyScore}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 border border-slate-800 overflow-hidden">
                  <div className="h-full bg-cyber-cyan" style={{ width: `${streamData.urgencyScore}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Truecaller Density Data */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 text-[9px] space-y-1">
            <div className="flex justify-between border-b border-slate-800/80 pb-0.5 text-slate-400 font-bold">
              <span className="text-hazard">[ ] TRUECALLER DENSITY:</span>
              <span>API_v4</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-slate-300 pt-0.5">
              <div>
                <span className="text-slate-500 block text-[8px]">REPUTATION:</span>
                <span className="text-cyber-cyan font-bold">
                  {streamData.truecallerSpamScore > 50 ? "FRAUD ALERT" : "VERIFIED"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[8px]">FLAGS:</span>
                <span className="text-crimson font-bold">
                  {streamData.truecallerSpamScore ? `${streamData.truecallerSpamScore * 12} FLAGS` : "0 FLAGS"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[8px]">CLASS:</span>
                <span className="text-slate-200 uppercase">[{streamData.callerCategory}]</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[8px]">ROUTING:</span>
                <span className="text-slate-400">PSTN_RELAY_09</span>
              </div>
            </div>
          </div>

          {/* Tactical Operator Overrides */}
          <div className="pt-2 border-t border-slate-800 flex flex-col space-y-1.5 text-[9px]">
            <button
              onClick={handleForceTransfer}
              disabled={callState === "IDLE"}
              className="p-1.5 border border-neon-green/50 bg-neon-green/10 text-neon-green hover:bg-neon-green/20 font-bold uppercase transition flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <UserCheck className="w-3 h-3" />
              [ FORCE DIRECT LINE BYPASS ]
            </button>

            <button
              onClick={handleForceBlock}
              disabled={callState === "IDLE"}
              className="p-1.5 border border-crimson/50 bg-crimson/10 text-crimson hover:bg-crimson/20 font-bold uppercase transition flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <PhoneOff className="w-3 h-3" />
              [ EMERGENCY TERMINATE & SHIELD ]
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#07090e] px-6 py-2 text-[9px] text-slate-500 flex flex-wrap items-center justify-between z-30">
        <div>
          <span>ANTIGRAVITY ORBITAL HUD // 4-COLUMN TACTICAL GRID</span>
          <span className="mx-2">•</span>
          <span>LATENCY: &lt;0.02ms</span>
        </div>
        <div>
          <span className="text-slate-400">CARRIER:</span> TwiML • Android Telecom • Truecaller v4.1
        </div>
      </footer>
    </div>
  );
}
