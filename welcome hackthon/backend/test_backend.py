import asyncio
from models import CallScreenRequest, CallAction, CallState, ContactCategory
from rules_engine import RulesEngine
from spam_evaluator import SpamEvaluator
from action_decider import ActionDecider
from main import screen_call

async def run_tests():
    print("=" * 60)
    print("RUNNING BACKEND INTELLIGENCE PIPELINE TESTS")
    print("=" * 60)

    # 1. Test RulesEngine
    re_engine = RulesEngine()
    vip = re_engine.lookup_contact("+14155550199")
    assert vip is not None, "VIP contact should exist"
    assert vip.category == ContactCategory.VIP, f"Expected VIP, got {vip.category}"
    print("[PASS] RulesEngine: VIP Contact found:", vip.name)

    blocked = re_engine.lookup_contact("+18005559999")
    assert blocked is not None and blocked.always_block is True, "Blocked contact check failed"
    print("[PASS] RulesEngine: Blocklist contact verified:", blocked.name)

    # 2. Test Truecaller Mock
    rep = await re_engine.lookup_truecaller("+18005559999")
    assert rep.spam_score >= 80, f"Expected spam_score >= 80, got {rep.spam_score}"
    print(f"[PASS] RulesEngine Truecaller: Reputation score {rep.spam_score}/100 verified.")

    # 3. Test SpamEvaluator
    se = SpamEvaluator()
    spam_eval = await se.evaluate("Internal Revenue Service final notice arrest warrant press 1")
    assert spam_eval.spam_risk >= 80, f"Expected high spam risk, got {spam_eval.spam_risk}"
    print(f"[PASS] SpamEvaluator: Detected scam with risk {spam_eval.spam_risk}/100.")

    urg_eval = await se.evaluate("Tommy was injured at school we are rushed to Stanford ER hospital emergency")
    assert urg_eval.urgency_score >= 85, f"Expected high urgency, got {urg_eval.urgency_score}"
    print(f"[PASS] SpamEvaluator: Detected critical emergency with urgency {urg_eval.urgency_score}/100.")

    # 4. End-to-End API Scenario 1: IRS Robocall -> BLOCK_SPAM
    print("\n--- Test Scenario 1: IRS Robocall ---")
    res1 = await screen_call(CallScreenRequest(
        caller_id="+18005559999",
        transcription_chunk="This is Internal Revenue Service calling regarding your criminal tax warrant press 1.",
        user_status="in_meeting"
    ))
    print(f"Result 1 -> Action: {res1.action}, State: {res1.call_state}, Urgency: {res1.urgency_score}, SpamRisk: {res1.spam_risk}")
    assert res1.action == CallAction.BLOCK_SPAM, f"Expected BLOCK_SPAM, got {res1.action}"
    assert res1.call_state == CallState.BLOCKED
    print("[PASS] Scenario 1 verified: Successfully blocked spam!")

    # 5. End-to-End API Scenario 2: Urgent Family Call -> TRANSFER_TO_USER
    print("\n--- Test Scenario 2: Urgent Family Hospital Emergency ---")
    res2 = await screen_call(CallScreenRequest(
        caller_id="+14155550199",
        transcription_chunk="Hey Tommy had a bad fall and we are heading to the emergency room at Stanford Hospital!",
        user_status="in_meeting"
    ))
    print(f"Result 2 -> Action: {res2.action}, State: {res2.call_state}, Urgency: {res2.urgency_score}, SpamRisk: {res2.spam_risk}")
    assert res2.action == CallAction.TRANSFER_TO_USER, f"Expected TRANSFER_TO_USER, got {res2.action}"
    assert res2.call_state == CallState.TRANSFERRED
    print("[PASS] Scenario 2 verified: Successfully transferred urgent emergency!")

    # 6. End-to-End API Scenario 3: Delivery Driver -> HANDLE_BY_AGENT
    print("\n--- Test Scenario 3: Food/Courier Delivery ---")
    res3 = await screen_call(CallScreenRequest(
        caller_id="+18005550111",
        transcription_chunk="Hi, I have a delivery outside the gate, what is the gate code?",
        user_status="in_meeting"
    ))
    print(f"Result 3 -> Action: {res3.action}, State: {res3.call_state}, Spoken: {res3.agent_spoken_response}")
    assert res3.action == CallAction.HANDLE_BY_AGENT, f"Expected HANDLE_BY_AGENT, got {res3.action}"
    assert "front door" in res3.agent_spoken_response.lower() or "meeting" in res3.agent_spoken_response.lower()
    print("[PASS] Scenario 3 verified: Agent safely handled delivery inquiry!")

    # 7. End-to-End API Scenario 4: Unknown Doctor Clinic -> HANDLE_BY_AGENT
    print("\n--- Test Scenario 4: Doctor Clinic Reschedule ---")
    res4 = await screen_call(CallScreenRequest(
        caller_id="+16505550143",
        transcription_chunk="Hello, calling to confirm your dental checkup tomorrow morning.",
        user_status="in_meeting"
    ))
    print(f"Result 4 -> Action: {res4.action}, State: {res4.call_state}")
    assert res4.action == CallAction.HANDLE_BY_AGENT
    print("[PASS] Scenario 4 verified: Routine clinic checkup handled by agent.")

    print("\n" + "=" * 60)
    print("ALL BACKEND TESTS PASSED SUCCESSFULLY! (100% PASS RATE)")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())
