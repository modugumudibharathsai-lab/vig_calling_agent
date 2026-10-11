# Telephony & Contact Integration Bridge

This service connects incoming telephone calls (via Twilio PSTN Voice or native Android `CallScreeningService`) into the **AI-Powered Personal Call Agent** intelligence pipeline.

## 1. Twilio Voice PSTN Setup
1. **Twilio Voice Webhook URL**:
   Set your Twilio incoming phone number webhook to:
   ```
   POST https://<YOUR-NGROK-OR-DOMAIN>/webhook/twilio/voice
   ```
2. **Execution Flow**:
   - Twilio triggers `/webhook/twilio/voice` when a caller dials your virtual number.
   - The AI Assistant speaks an initial prompt (`<Gather input="speech">`).
   - Twilio's Speech-to-Text engine posts transcribed speech chunks to `/webhook/twilio/transcription`.
   - The bridge invokes `/api/screen-call` on the Python backend:
     - `BLOCK_SPAM`: TwiML plays rejection message and issues `<Reject reason="busy"/>`.
     - `TRANSFER_TO_USER`: TwiML dials the user's private cell phone `<Dial>+1...</Dial>`.
     - `HANDLE_BY_AGENT`: TwiML plays dynamic AI conversational response and gathers follow-up message.

## 2. Android `CallScreeningService` Setup
1. In your Android app manifest:
   ```xml
   <service android:name=".AgyCallScreeningService"
            android:permission="android.permission.BIND_SCREENING_SERVICE">
       <intent-filter>
           <action android:name="android.telecom.CallScreeningService" />
       </intent-filter>
   </service>
   ```
2. In `AgyCallScreeningService.kt`:
   ```kotlin
   override fun onScreenCall(callDetails: Call.Details) {
       val phoneNumber = callDetails.handle.schemeSpecificPart
       val payload = JSONObject().apply {
           put("call_id", callDetails.networkAddress)
           put("caller_number", phoneNumber)
           put("call_direction", "INCOMING")
       }
       // POST payload to /webhook/android/screen
       // Apply CallResponse.Builder() with disallowCall, rejectCall, silenceCall
   }
   ```

## 3. Running Call Simulation
Run the CLI simulator directly:
```bash
python simulate_calls.py --scenario all
```
Or stream live chunks to the Next.js visual dashboard:
```bash
python simulate_calls.py --scenario 1 --stream
```
