import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getScript, getAllProgress, getProfile } from "../api";
import type {
  ScriptDay,
  ScriptLine,
  PronunciationResult,
  ConversationMode,
} from "../types";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { useMicrophone } from "../hooks/useMicrophone";
import WinBar from "../components/WinBar";
import RetroScene from "../components/RetroScene";
import AmbientSky from "../components/AmbientSky";

type Phase =
  | "loading"
  | "app-speaking"
  | "user-turn"
  | "recording"
  | "processing"
  | "result-pass"
  | "result-fail"
  | "day-complete";

export default function ConversationPage() {
  const { mode } = useParams<{ mode: ConversationMode }>();
  const navigate = useNavigate();

  const [scriptDay, setScriptDay] = useState<ScriptDay | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [lastResult, setLastResult] = useState<PronunciationResult | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [userName, setUserName] = useState<string>("Matthew"); // Default fallback

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const lastSpokenLineRef = useRef<number | null>(null);
  const { isRecording, startRecording, stopRecording } = useMicrophone();

  const currentLine: ScriptLine | undefined =
    scriptDay?.lines[currentLineIndex];

  const SpeechRecognitionClass =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      : null;
  const hasSpeechRecognition = !!SpeechRecognitionClass;

  const playBase64Audio = useCallback((base64: string) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    audioRef.current = audio;
    audio.play();
    audio.onended = () => setPhase("user-turn");
  }, []);

  const handleTtsEnd = useCallback(() => {
    // Just set phase to user-turn; line advancement will happen in a separate effect
    setPhase("user-turn");
  }, []);

  const { requestTts, sendAudio, submitTranscript } =
    useConversationSocket({
      onTtsAudio: (audio, _slow) => playBase64Audio(audio),
      onPronunciationResult: (result) => {
        setLastResult(result);
        setPhase(result.passed ? "result-pass" : "result-fail");
      },
      onError: (msg) => {
        console.error("Socket error:", msg);
        setPhase("user-turn");
      },
      onTtsEnd: handleTtsEnd,
    });

  // Load script and progress on mount
  useEffect(() => {
    if (!mode) return;
    // Get user profile to get their actual name
    getProfile()
      .then(({ data }) => {
        if (data.name) {
          setUserName(data.name);
        }
      })
      .catch((err) => {
        console.error("Failed to load profile", err);
        // Continue with default name
      });

    getAllProgress().then(({ data }) => {
      const p = mode === "normal" ? data.normal : data.romantic;
      setCurrentDay(p.current_day);
      setCurrentLineIndex(p.current_line - 1);
    });
  }, [mode]);

  // Helper function to substitute user's name in script
  const substituteUserNameInScript = (
    script: ScriptDay,
    actualName: string,
  ): ScriptDay => {
    if (!actualName || actualName === "Matthew") return script; // No substitution needed

    return {
      ...script,
      lines: script.lines.map((line) => ({
        ...line,
        turkish: line.turkish?.replace(/Matthew/g, actualName) || line.turkish,
        english: line.english?.replace(/Matthew/g, actualName) || line.english,
        expected_response:
          line.expected_response?.replace(/Matthew/g, actualName) ||
          line.expected_response,
        user_prompt:
          line.user_prompt?.replace(/Matthew/g, actualName) || line.user_prompt,
        correction_hint:
          line.correction_hint?.replace(/Matthew/g, actualName) ||
          line.correction_hint,
      })),
    };
  };

  useEffect(() => {
    if (!mode || !currentDay) return;
    getScript(mode, currentDay).then(({ data }) => {
      const scriptWithUserName = substituteUserNameInScript(data, userName);
      setScriptDay(scriptWithUserName);
      setPhase("app-speaking");
    });
  }, [mode, currentDay, userName]);

  // Auto-speak app lines
  useEffect(() => {
    if (phase !== "app-speaking" || !currentLine) return;

    // Only speak if we haven't spoken this line yet
    if (lastSpokenLineRef.current === currentLine.line_number) return;
    lastSpokenLineRef.current = currentLine.line_number;

    if (currentLine.speaker === "app" && currentLine.turkish) {
      requestTts(currentLine.turkish);
    } else if (currentLine.speaker === "user") {
      // It's already the user's turn — show the prompt
      setPhase("user-turn");
    }
  }, [phase, currentLine]);

  // Advance to user line when phase transitions to user-turn after app speaks
  useEffect(() => {
    if (
      phase === "user-turn" &&
      currentLine?.speaker === "app" &&
      scriptDay &&
      currentLineIndex < scriptDay.lines.length - 1
    ) {
      setCurrentLineIndex(currentLineIndex + 1);
    }
  }, [phase, currentLine, currentLineIndex, scriptDay]);

  const handleRecord = async () => {
    // Clear previous errors when attempting to record again
    setErrorMessage("");

    if (hasSpeechRecognition) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setPhase("processing");
        return;
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = "tr-TR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log("[Speech] Recognition started, listening...");
        setErrorMessage(""); // Clear any previous errors once listening starts
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join(" ")
          .trim();

        if (transcript) {
          console.log("[Speech] Got transcript:", transcript);
          submitTranscript(
            transcript,
            mode!,
            currentDay,
            currentLine!.line_number,
          );
        } else {
          console.warn("[Speech] Empty transcript detected");
          setPhase("user-turn");
        }
      };

      recognition.onend = () => {
        console.log("[Speech] Recognition ended");
        recognitionRef.current = null;
      };

      recognition.onerror = (ev: any) => {
        console.error("[Speech] Error:", ev.error);
        const errorMsg = ev.error || "Unknown error";
        let userMessage = "";

        // Provide specific feedback for common errors
        if (errorMsg === "no-speech") {
          console.warn("[Speech] No speech detected - please try again");
          userMessage =
            "No speech detected. Please make sure your microphone is working and try again.";
        } else if (errorMsg === "network") {
          console.error("[Speech] Network error during speech recognition");
          userMessage =
            "Network error. Please check your connection and try again.";
        } else if (errorMsg === "not-allowed") {
          console.error(
            "[Speech] Microphone access denied - check permissions",
          );
          userMessage =
            "Microphone access denied. Please allow microphone access in your browser settings.";
        } else if (errorMsg === "service-not-allowed") {
          userMessage = "Speech recognition service is not available.";
        } else {
          userMessage = `Speech recognition error: ${errorMsg}. Please try again.`;
        }

        setErrorMessage(userMessage);
        // Don't reset to user-turn yet - let onend handle it
        setPhase("user-turn");
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      setPhase("recording");
    } else {
      // Fallback to media recorder flow
      if (isRecording) {
        setPhase("processing");
        const base64 = await stopRecording();
        sendAudio(base64, mode!, currentDay, currentLine!.line_number);
      } else {
        try {
          await startRecording();
          setPhase("recording");
        } catch (e) {
          console.error("Microphone start failed", e);
          alert("Unable to access microphone.");
        }
      }
    }
  };

  const handleNext = () => {
    if (!scriptDay) return;
    const nextIndex = currentLineIndex + 1;
    if (nextIndex >= scriptDay.lines.length) {
      setPhase("day-complete");
    } else {
      setCurrentLineIndex(nextIndex);
      setPhase("app-speaking");
      setLastResult(null);
    }
  };

  const handleSlowPlay = () => {
    if (!currentLine?.turkish) return;
    requestTts(currentLine.turkish, true);
    setPhase("app-speaking");
  };

  if (phase === "loading" || !scriptDay || !currentLine) {
    return <div className="loading">Loading conversation...</div>;
  }

  if (phase === "day-complete") {
    return (
      <>
        <div className="day-complete">
          <RetroScene variant="day" />
          <div className="day-complete-card win">
            <WinBar label="day-complete.exe" tone="mint" />
            <div className="day-complete-card-body">
              <div className="confetti">🎉</div>
              <h2>Day {currentDay} Complete!</h2>
              <p>Harika iş! (Great job!)</p>
              {currentDay < 3 ? (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn-retro btn-retro--purple"
                >
                  Back to Dashboard
                </button>
              ) : (
                <>
                  <p>You've completed all days of {mode} mode!</p>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="btn-retro btn-retro--purple"
                  >
                    Back to Dashboard
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Browser STT fallback notice */}
        {!hasSpeechRecognition && (
          <div className="stt-fallback-banner">
            <strong>Microphone fallback:</strong> Your browser does not support
            the Web Speech API (SpeechRecognition). The app will record audio
            and send it to the server for transcription. For best results use
            Chrome or Edge which support speech recognition.
          </div>
        )}
      </>
    );
  }

  const totalLines = scriptDay.lines.length;
  const progressPct = ((currentLineIndex + 1) / totalLines) * 100;

  return (
    <div className="conversation-page">
      <AmbientSky />
      {/* Top bar */}
      <div className="conv-topbar">
        <button onClick={() => navigate("/dashboard")} className="btn-back">
          ← Dashboard
        </button>
        <span className="conv-day-label">
          {mode === "romantic" ? "❤️" : "💬"} Day {currentDay}
        </span>
        <span className="conv-progress-label mono-pill">
          {currentLineIndex + 1}/{totalLines}
        </span>
      </div>

      {/* Progress bar */}
      <div className="conv-progress-bar">
        <div
          className="conv-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main content */}
      <div className="conv-content">
        {/* App line display */}
        {currentLine.turkish && (
          <div className="line-card app-line win">
            <WinBar label="app.tts" tone="purple" />
            <div className="line-card-body">
              <div className="line-speaker">🤖 App</div>
              <p className="line-turkish">{currentLine.turkish}</p>
              {currentLine.slow_phonetic && (
                <p className="line-phonetic">{currentLine.slow_phonetic}</p>
              )}
              {currentLine.english && (
                <p className="line-english">{currentLine.english}</p>
              )}
              <button className="btn-retro btn-retro--ghost btn-retro--sm btn-slow" onClick={handleSlowPlay}>
                🐢 Slow
              </button>
            </div>
          </div>
        )}

        {/* User prompt */}
        {currentLine.speaker === "user" && (
          <div className="line-card user-line win">
            <WinBar label="your-turn.mic" tone="pink" />
            <div className="line-card-body">
              <div className="line-speaker">
                🎤 You
                {currentLine.expected_response && (
                  <span className="expected-response">
                    {" "}
                    — Say: {currentLine.expected_response}
                  </span>
                )}
              </div>
              {currentLine.user_prompt && (
                <p className="line-prompt">{currentLine.user_prompt}</p>
              )}
              {currentLine.slow_phonetic && (
                <p className="line-phonetic">{currentLine.slow_phonetic}</p>
              )}
            </div>
          </div>
        )}

        {/* Result feedback */}
        {phase === "result-pass" && lastResult && (
          <div className="result-card pass win">
            <WinBar label="result.ok" tone="mint" />
            <div className="result-card-body">
              <div className="result-icon">✅</div>
              <p className="result-score">
                Score: {Math.round(lastResult.score * 100)}%
              </p>
              <p className="result-transcript">
                You said: "<em>{lastResult.transcript}</em>"
              </p>
              <button className="btn-retro btn-retro--mint btn-next" onClick={handleNext}>
                Next →
              </button>
            </div>
          </div>
        )}

        {phase === "result-fail" && lastResult && (
          <div className="result-card fail win">
            <WinBar label="result.retry" tone="orange" />
            <div className="result-card-body">
              <div className="result-icon">❌</div>
              <p className="result-score">
                Score: {Math.round(lastResult.score * 100)}% — Try again!
              </p>
              <p className="result-transcript">
                You said: "<em>{lastResult.transcript}</em>"
              </p>
              {lastResult.correction_hint && (
                <p className="result-hint">💡 {lastResult.correction_hint}</p>
              )}
              <p className="result-attempts">
                Attempt {lastResult.attempt_count}
              </p>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div className="processing-indicator">
            <div className="spinner" />
            <p>Analysing pronunciation...</p>
          </div>
        )}

        {/* Error message display */}
        {errorMessage && (
          <div className="error-message win">
            <WinBar label="error" tone="pink" />
            <div className="line-card-body">
              <p>{errorMessage}</p>
              <button className="btn-retro btn-retro--pink btn-retro--sm" onClick={() => setErrorMessage("")}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Mic button — visible when it's user's turn to speak */}
        {currentLine?.speaker === "user" && (
          <div className="button-group">
            <button
              className="btn-retro btn-retro--ghost btn-listen"
              onClick={() => {
                if (currentLine.expected_response) {
                  requestTts(currentLine.expected_response);
                }
              }}
              disabled={phase === "processing"}
              title="Listen to the pronunciation"
            >
              🔊 Listen
            </button>
            <button
              className={`btn-retro btn-retro--pink btn-mic ${isRecording ? "recording" : ""}`}
              onClick={handleRecord}
              disabled={phase === "processing"}
              title="Speak your response"
            >
              {isRecording ? "⏹ Stop" : "🎤 Speak"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
