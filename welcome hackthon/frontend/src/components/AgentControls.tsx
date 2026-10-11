"use client";

import React, { useState } from "react";
import {
  Sliders,
  Clock,
  UserCheck,
  ShieldAlert,
  Play,
  CheckCircle,
  Plus,
  RefreshCw,
  Bell,
  Sparkles,
} from "lucide-react";

export interface ContactItem {
  phone_number: string;
  name: string;
  category: string;
  always_transfer: boolean;
  always_block: boolean;
  notes?: string;
}

interface AgentControlsProps {
  mode: "MANUAL" | "SCHEDULED";
  manualEnabled: boolean;
  userStatus: string;
  onToggleMode: (newMode: "MANUAL" | "SCHEDULED") => void;
  onToggleManualScreening: (enabled: boolean) => void;
  onChangeUserStatus: (status: string) => void;
  onRunSimulation: (scenario: string) => void;
  contacts: ContactItem[];
  onAddContact: (contact: ContactItem) => void;
  isSimulating: boolean;
}

export const AgentControls: React.FC<AgentControlsProps> = ({
  mode,
  manualEnabled,
  userStatus,
  onToggleMode,
  onToggleManualScreening,
  onChangeUserStatus,
  onRunSimulation,
  contacts,
  onAddContact,
  isSimulating,
}) => {
  const [activeTab, setActiveTab] = useState<"MODES" | "RULES" | "SIMULATOR">("MODES");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("VIP");

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone || !newName) return;
    onAddContact({
      phone_number: newPhone,
      name: newName,
      category: newCategory,
      always_transfer: newCategory === "VIP",
      always_block: newCategory === "BLOCKLIST",
    });
    setNewPhone("");
    setNewName("");
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab("MODES")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "MODES"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Agent Mode
        </button>
        <button
          onClick={() => setActiveTab("RULES")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "RULES"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Contact Rules
        </button>
        <button
          onClick={() => setActiveTab("SIMULATOR")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "SIMULATOR"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Test Simulator
        </button>
      </div>

      {/* Tab 1: Agent Mode & User Status */}
      {activeTab === "MODES" && (
        <div className="mt-5 space-y-5 flex-1">
          {/* Mode Switcher */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Operating Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onToggleMode("MANUAL")}
                className={`p-3 rounded-lg border text-left transition ${
                  mode === "MANUAL"
                    ? "bg-indigo-950/70 border-indigo-500 text-white"
                    : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  Manual Mode
                  {mode === "MANUAL" && <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Direct ON/OFF toggle</p>
              </button>

              <button
                onClick={() => onToggleMode("SCHEDULED")}
                className={`p-3 rounded-lg border text-left transition ${
                  mode === "SCHEDULED"
                    ? "bg-indigo-950/70 border-indigo-500 text-white"
                    : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  Scheduled Mode
                  {mode === "SCHEDULED" && <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Follows DND windows</p>
              </button>
            </div>
          </div>

          {/* Manual Mode Toggle */}
          {mode === "MANUAL" && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">
                  AI Call Screening Interceptor
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  When enabled, AI intercepts and filters all incoming rings.
                </p>
              </div>
              <button
                onClick={() => onToggleManualScreening(!manualEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  manualEnabled ? "bg-indigo-600" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    manualEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Scheduled Windows Overview */}
          {mode === "SCHEDULED" && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Scheduled Screening Windows
                </span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  AUTO SCHEDULE ACTIVE
                </span>
              </div>
              <div className="space-y-1.5 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-200">Work Hours Focus</p>
                    <p className="text-[10px] text-slate-400">Mon-Fri • 09:00 - 17:00</p>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300">SCREEN ACTIVE</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-200">Night Do-Not-Disturb</p>
                    <p className="text-[10px] text-slate-400">All Days • 22:00 - 07:30</p>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300">VIP BYPASS ONLY</span>
                </div>
              </div>
            </div>
          )}

          {/* User Current Status Selector */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Your Current Status
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {["in_meeting", "focus_time", "available", "sleeping", "driving"].map((status) => (
                <button
                  key={status}
                  onClick={() => onChangeUserStatus(status)}
                  className={`py-2 px-2.5 rounded-lg border capitalize text-center transition ${
                    userStatus === status
                      ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold"
                      : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contact Rules */}
      {activeTab === "RULES" && (
        <div className="mt-5 space-y-4 flex-1 flex flex-col">
          {/* Quick Add Form */}
          <form onSubmit={handleCreateContact} className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              Add Contact Rule
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name (e.g. Alex)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="+1415555..."
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
              >
                <option value="VIP">VIP (Always Ring)</option>
                <option value="COLLEAGUE">Colleague (Screen)</option>
                <option value="TRUSTED">Trusted Courier</option>
                <option value="BLOCKLIST">Blocklist (Auto Reject)</option>
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Add Rule
              </button>
            </div>
          </form>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
            {contacts.map((c, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{c.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        c.category === "VIP"
                          ? "bg-purple-900/60 text-purple-300"
                          : c.category === "BLOCKLIST"
                          ? "bg-rose-900/60 text-rose-300"
                          : "bg-blue-900/60 text-blue-300"
                      }`}
                    >
                      {c.category}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">{c.phone_number}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-indigo-300 font-medium">
                    {c.always_transfer ? "Direct Pass" : c.always_block ? "Auto Block" : "AI Screen"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Call Simulator */}
      {activeTab === "SIMULATOR" && (
        <div className="mt-5 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-2.5">
            <p className="text-xs text-slate-400">
              Trigger instant end-to-end simulated calls to test the 3D Orb, speech streaming, and decision decider:
            </p>

            <button
              disabled={isSimulating}
              onClick={() => onRunSimulation("URGENT_FAMILY")}
              className="w-full p-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/50 text-left transition flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <p className="text-xs font-semibold text-purple-200">
                  Scenario A: Urgent Family Hospital Emergency
                </p>
                <p className="text-[11px] text-purple-400/80">
                  VIP Spouse calling about ER • Triggers TRANSFER_TO_USER
                </p>
              </div>
              <Play className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
            </button>

            <button
              disabled={isSimulating}
              onClick={() => onRunSimulation("ROBOCALL_SPAM")}
              className="w-full p-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/50 text-left transition flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <p className="text-xs font-semibold text-rose-200">
                  Scenario B: IRS Tax Warrant Robocall
                </p>
                <p className="text-[11px] text-rose-400/80">
                  Automated imposter scam • Triggers BLOCK_SPAM
                </p>
              </div>
              <Play className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
            </button>

            <button
              disabled={isSimulating}
              onClick={() => onRunSimulation("FOOD_DELIVERY")}
              className="w-full p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/50 text-left transition flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <p className="text-xs font-semibold text-amber-200">
                  Scenario C: Food Courier at Front Gate
                </p>
                <p className="text-[11px] text-amber-400/80">
                  Delivery inquiry • Agent answers: leave at front door
                </p>
              </div>
              <Play className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            </button>

            <button
              disabled={isSimulating}
              onClick={() => onRunSimulation("DOCTOR_CLINIC")}
              className="w-full p-3 rounded-xl bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/50 text-left transition flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <p className="text-xs font-semibold text-sky-200">
                  Scenario D: Doctor Clinic Appointment
                </p>
                <p className="text-[11px] text-sky-400/80">
                  Appointment confirmation • Agent records message
                </p>
              </div>
              <Play className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
            </button>
          </div>

          {isSimulating && (
            <div className="p-3 rounded-xl bg-indigo-950/50 border border-indigo-800/50 flex items-center gap-2 text-indigo-300 text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Simulating incoming call audio packets over WebSockets...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
