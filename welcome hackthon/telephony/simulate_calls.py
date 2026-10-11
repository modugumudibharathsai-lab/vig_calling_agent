import asyncio
import argparse
import sys
import httpx
import websockets
import json

BACKEND_URL = "http://127.0.0.1:8000"
BRIDGE_URL = "http://127.0.0.1:8001"

SCENARIOS = {
    "1": {
        "name": "IRS Robocall Scam",
        "caller_id": "+18005559999",
        "caller_label": "RoboDialer Fraud Syndicate (+1 800-555-9999)",
        "transcript": "Attention: This is the Internal Revenue Service calling. An urgent arrest warrant has been issued in your name. Press 1 immediately or federal police will seize your assets."
    },
    "2": {
        "name": "Urgent Family Emergency (VIP)",
        "caller_id": "+14155550199",
        "caller_label": "Sarah Chen (Wife) (+1 415-555-0199)",
        "transcript": "Hey Tommy had a bad fall at soccer and we are rushing to the Stanford ER emergency room, pick up please!"
    },
    "3": {
        "name": "Courier / Food Delivery Inquiry",
        "caller_id": "+18005550111",
        "caller_label": "DoorDash / FedEx Delivery (+1 800-555-0111)",
        "transcript": "Hi, I have a delivery outside the front gate, can you buzz me in or should I drop it by the door?"
    },
    "4": {
        "name": "Doctor Clinic Routine Follow-up",
        "caller_id": "+16505550143",
        "caller_label": "Dr. Miller Clinic (+1 650-555-0143)",
        "transcript": "Hello, calling to confirm your upcoming dental cleaning appointment tomorrow morning at 9:30 AM."
    }
}

async def test_screen_call(scenario_key: str):
    sc = SCENARIOS.get(scenario_key)
    if not sc:
        print(f"Unknown scenario key: {scenario_key}")
        return

    print("\n" + "=" * 60)
    print(f"DISPATCHING CALL SIMULATION: {sc['name']}")
    print(f"Caller: {sc['caller_label']}")
    print(f"Transcript: \"{sc['transcript']}\"")
    print("=" * 60)

    payload = {
        "caller_id": sc["caller_id"],
        "transcription_chunk": sc["transcript"],
        "user_status": "in_meeting"
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.post(f"{BACKEND_URL}/api/screen-call", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                print("\n[AI SCREENING RESULT]")
                print(f"  Decision Action:      {data['action']}")
                print(f"  Orb / Call State:     {data['call_state']}")
                print(f"  Urgency Score:        {data['urgency_score']} / 100")
                print(f"  Spam Risk:            {data['spam_risk']} / 100")
                print(f"  Agent Spoken Output:  \"{data['agent_spoken_response']}\"")
                print(f"  Reasoning:            {data['reasoning']}")
                print(f"  Caller Classification:{data['caller_category']}")
            else:
                print(f"[Error] Backend returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Connection Error] Is the backend running at {BACKEND_URL}? Error: {e}")

async def test_stream(scenario_key: str):
    """Simulates real-time progressive speech-to-text token streaming."""
    sc = SCENARIOS.get(scenario_key)
    if not sc:
        return

    call_id = f"cli-{scenario_key}"
    words = sc["transcript"].split()
    accumulated = []

    print(f"\n[STREAMING CO-PILOT] Connecting to WebSocket: {BACKEND_URL}/ws/calls/{call_id}...")
    try:
        ws_url = f"ws://127.0.0.1:8000/ws/calls/{call_id}"
        async with websockets.connect(ws_url) as ws:
            print("[CONNECTED] Streaming incoming speech chunks in real-time...\n")
            for i in range(0, len(words), 3):
                chunk = " ".join(words[:i+3])
                await ws.send(json.dumps({
                    "type": "TRANSCRIPTION_CHUNK",
                    "caller_id": sc["caller_id"],
                    "chunk": chunk
                }))
                print(f">> [Audio Stream Chunk]: \"{chunk}\"")
                await asyncio.sleep(0.8)

            print("\n[SUCCESS] Stream complete. Live co-pilot updated on dashboard.")
    except Exception as e:
        print(f"[WebSocket Error] Could not connect to WebSocket: {e}")

async def main():
    parser = argparse.ArgumentParser(description="AI Personal Call Agent Telephony Simulator")
    parser.add_argument("--scenario", "-s", choices=["1", "2", "3", "4", "all"], default="all", help="1=IRS Scam, 2=Urgent Family, 3=Delivery, 4=Clinic, all=Run all")
    parser.add_argument("--stream", action="store_true", help="Simulate progressive live token streaming via WebSocket")
    args = parser.parse_args()

    if args.stream:
        target = "1" if args.scenario == "all" else args.scenario
        await test_stream(target)
    elif args.scenario == "all":
        for k in ["1", "2", "3", "4"]:
            await test_screen_call(k)
            await asyncio.sleep(0.5)
    else:
        await test_screen_call(args.scenario)

if __name__ == "__main__":
    asyncio.run(main())
