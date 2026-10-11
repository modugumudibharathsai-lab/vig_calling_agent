"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  UserCheck,
  AlertTriangle,
  Bot,
  Volume2,
  Sparkles,
  ArrowUpRight,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
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

interface TranscriptFeedProps {
  streamData: StreamData;
  onForceTransfer: () => void;
  onForceBlock: () => void;
  isConnected: boolean;
}

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({
  streamData,
  onForceTransfer,
  onForceBlock,
  isConnected,
}) => {
  const isCallActive = streamData.callState !== "IDLE";

  return (
    <div className="flex flex-col h-full glass-panel-glow rounded-2xl p-6 relative overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <span
              className={`w-3 h-3 rounded-full block ${
                isConnected ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            {isConnected && (
              <span className="w-3 h-3 rounded-full bg-emerald-400 absolute inset-0 animate-ping opacity-75" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Live Co-Pilot Stream
            </h2>
            <p className="text-xs text-slate-400">
              {isConnected
                ? "WebSocket telemetry pipe connected"
                : "Reconnecting to backend..."}
            </p>
          </div>
        </div>

        {/* Call ID Tag */}
        <div className="text-right">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
            SESSION: {streamData.callId || "STANDBY"}
          </span>
        </div>
      </div>

      {/* Caller Identification Card */}
      <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md font-bold">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 text-sm">
                {streamData.callerName || "Awaiting Call Entry"}
              </span>
              {streamData.callerCategory && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border ${
                    streamData.callerCategory === "VIP"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      : streamData.callerCategory === "BLOCKLIST"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                  }`}
                >
                  {streamData.callerCategory}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {streamData.callerId || "No active line connected"}
            </p>
          </div>
        </div>

        {/* Truecaller Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-800/40 text-sky-300 text-xs">
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-medium">Truecaller Verified:</span>
          <span
            className={`font-mono font-bold ${
              (streamData.truecallerSpamScore || 0) > 50
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {(streamData.truecallerSpamScore || 0) > 50 ? "SPAM RISK" : "CLEAN"}
          </span>
        </div>
      </div>

      {/* Real-time Metric Gauges */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Urgency Score */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Urgency Index
            </span>
            <span
              className={`font-mono font-bold text-sm ${
                streamData.urgencyScore > 70
                  ? "text-amber-400"
                  : streamData.urgencyScore > 40
                  ? "text-yellow-400"
                  : "text-slate-300"
              }`}
            >
              {streamData.urgencyScore} / 100
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all duration-500 ${
                streamData.urgencyScore > 70
                  ? "bg-gradient-to-r from-amber-500 to-rose-500"
                  : streamData.urgencyScore > 40
                  ? "bg-gradient-to-r from-indigo-500 to-amber-500"
                  : "bg-indigo-500"
              }`}
              style={{ width: `${streamData.urgencyScore}%` }}
            />
          </div>
        </div>

        {/* Spam Risk */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Spam Probability
            </span>
            <span
              className={`font-mono font-bold text-sm ${
                streamData.spamRisk > 70
                  ? "text-rose-400 font-extrabold animate-pulse"
                  : streamData.spamRisk > 40
                  ? "text-orange-400"
                  : "text-emerald-400"
              }`}
            >
              {streamData.spamRisk} / 100
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all duration-500 ${
                streamData.spamRisk > 70
                  ? "bg-gradient-to-r from-orange-500 to-rose-600"
                  : streamData.spamRisk > 40
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${streamData.spamRisk}%` }}
            />
          </div>
        </div>
      </div>

      {/* Live Audio Transcription Feed */}
      <div className="mt-4 flex-1 flex flex-col min-h-[160px] p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            Live Caller Speech-to-Text
          </span>
          {streamData.sentiment && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Tone: {streamData.sentiment}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-200 font-normal">
          {streamData.transcript ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-slate-100 tracking-wide whitespace-pre-wrap"
            >
              &ldquo;{streamData.transcript}&rdquo;
            </motion.p>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
              <Bot className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
              <p className="text-xs">
                No active call audio stream in progress.
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                Select a simulation scenario below or trigger an incoming call.
              </p>
            </div>
          )}
        </div>

        {/* Highlighted Trigger Pills */}
        {streamData.keyPhrases && streamData.keyPhrases.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-900">
            {streamData.keyPhrases.map((phrase, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/70 text-indigo-300 border border-indigo-800/40"
              >
                #{phrase}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Agent Spoken Voice Response & Decision Banner */}
      <div className="mt-4 p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">
              AI Spoken Reply to Caller
            </span>
          </div>

          {/* Action Decider Badge */}
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              streamData.action === "TRANSFER_TO_USER"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : streamData.action === "BLOCK_SPAM"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : streamData.action === "HANDLE_BY_AGENT"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {streamData.action || "STANDBY"}
          </span>
        </div>

        <p className="text-xs text-indigo-200 italic leading-relaxed">
          {streamData.agentSpokenResponse
            ? `"${streamData.agentSpokenResponse}"`
            : "Agent is listening and synthesizing real-time response..."}
        </p>

        {streamData.reasoning && (
          <p className="text-[11px] text-slate-400 mt-2 font-sans pt-2 border-t border-indigo-900/30">
            <strong className="text-slate-300">Decision Rationale:</strong>{" "}
            {streamData.reasoning}
          </p>
        )}
      </div>

      {/* Live Operator Intervention Controls */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">Manual Operator Override:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onForceTransfer}
            disabled={!isCallActive}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Force Transfer
          </button>
          <button
            onClick={onForceBlock}
            disabled={!isCallActive}
            className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Force Drop & Block
          </button>
        </div>
      </div>
    </div>
  );
};
