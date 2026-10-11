# AI-Powered Personal Call Agent (Full-Stack GSD)

An intelligent, autonomous call screening agent that intercepts incoming telephone rings, transcribes caller speech in real-time, scores spam risk and urgency using an LLM pipeline, and either transfers urgent calls, answers autonomously with dynamic speech, or blocks spam.

Features an **Aceternity UI Next.js Visual Dashboard** with a **3D reactive floating orb** responding to call states (`IDLE`, `SCREENING`, `TRANSFERRED`, `BLOCKED`).

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       Incoming Telephone Call         |
                      |  (Twilio PSTN Voice / Android Service) |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |    Telephony Bridge (/telephony)      |
                      |  Translates Webhooks <-> Backend API  |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |   FastAPI Intelligence (/backend)     |
                      |  - RulesEngine (Contacts & Schedule)  |
                      |  - SpamEvaluator (Fast LLM / NLP)     |
                      |  - ActionDecider (3-Way Decision)     |
                      +-------------------+-------------------+
                                          |
                   WebSocket Live Stream  |  REST State Sync
                                          v
                      +---------------------------------------+
                      |  Next.js Antigravity Dashboard (:3000)|
                      |  - 3D Floating Reactive Visual Orb    |
                      |  - Live Streaming Co-Pilot Feed       |
                      |  - Agent Mode & Schedule Controls     |
                      |  - Interactive Scenario Simulator     |
                      +---------------------------------------+
```

---

## Directory Structure

- **`/backend`**: FastAPI Python Intelligence Server
  - `main.py`: `POST /api/screen-call`, WebSockets `/ws/calls/{id}`, simulation triggers.
  - `rules_engine.py`: Local `contacts.json` cache, Manual vs. Scheduled mode windows, Truecaller reputation API.
  - `spam_evaluator.py`: Fast LLM prompt (Gemini/OpenAI) + zero-latency heuristic pattern engine.
  - `action_decider.py`: Decision matrix returning `HANDLE_BY_AGENT`, `TRANSFER_TO_USER`, or `BLOCK_SPAM`.
  - `contacts.json`: Configurable contact directory (VIPs, Family, Colleagues, Blocklist).
  - `test_backend.py`: Automated test suite for all 4 call archetypes.
- **`/frontend`**: Next.js 15 Antigravity Visual Dashboard
  - `src/components/Orb3D.tsx`: 3D Canvas visualizer reacting to IDLE, SCREENING, TRANSFERRED, BLOCKED states.
  - `src/components/TranscriptFeed.tsx`: Live streaming speech-to-text token feed, sentiment tags, Urgency (0-100) & Spam Risk (0-100) gauges, and operator overrides.
  - `src/components/AgentControls.tsx`: Manual Mode ON/OFF, Scheduled Mode DND windows, custom contact rule editor, and 1-click test scenarios.
- **`/telephony`**: Telephony & Android Call Screening Integration Bridge
  - `bridge.py`: Twilio PSTN voice webhooks (TwiML) & Android `CallScreeningService` JSON adapter.
  - `simulate_calls.py`: CLI testing tool to simulate incoming calls and live speech streams.

---

## Quick Start

### 1. Start the Python Intelligence Backend
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Start the Telephony Integration Bridge
```bash
cd telephony
python -m uvicorn bridge:app --host 127.0.0.1 --port 8001 --reload
```

### 3. Start the Next.js Visual Dashboard
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Testing & Call Simulations

### Interactive Dashboard Simulator
Inside the Next.js Dashboard, navigate to the **Test Simulator** tab to launch instant live call streams:
1. **Scenario A**: Urgent Family Hospital Emergency (`TRANSFER_TO_USER`) -> 3D Orb turns glowing **emerald green**.
2. **Scenario B**: IRS Imposter Tax Warrant Robocall (`BLOCK_SPAM`) -> 3D Orb turns defensive **crimson red**.
3. **Scenario C**: DoorDash / FedEx Courier at Gate (`HANDLE_BY_AGENT`) -> AI instructs driver to drop package by door.
4. **Scenario D**: Clinic Doctor Follow-up (`HANDLE_BY_AGENT`) -> AI notes message for user.

### CLI Testing Simulator
```bash
cd telephony
# Run all scenarios
python simulate_calls.py --scenario all

# Stream live speech packets progressively over WebSockets:
python simulate_calls.py --scenario 1 --stream
```
