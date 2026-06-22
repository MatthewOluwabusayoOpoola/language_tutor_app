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
  const [showHelper, setShowHelper] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const lastSpokenLineRef = useRef<number | null>(null);
  const { isRecording, startRecording, stopRecording } = useMicrophone();

  const currentLine: ScriptLine | undefined =
    scriptDay?.lines[currentLineIndex];

  // For user-turn lines, get helper data from the previous app line
  const getHelperLineData = (): ScriptLine | undefined => {
    if (!scriptDay || !currentLine) return undefined;
    if (currentLine.speaker !== "user") return currentLine;
    // Find previous line (should be the app line with the prompt)
    const prevLine = scriptDay.lines[currentLineIndex - 1];
    return prevLine?.speaker === "app" ? prevLine : undefined;
  };

  const helperLineData = getHelperLineData();

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

  const { requestTts, sendAudio, submitTranscript } = useConversationSocket({
    onTtsAudio: (audio, _slow) => playBase64Audio(audio),
    onPronunciationResult: (result) => {
      setLastResult(result);
      // Update currentDay if server returned updated progress (only day, not line)
      // The line index will be incremented by handleNext() to avoid double-incrementing
      if (result.passed && result.progress) {
        setCurrentDay(result.progress.current_day);
      }
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
      // Only set phase to app-speaking if we're in loading phase (initial load)
      // This prevents overriding result screens when day changes
      setPhase((prevPhase) =>
        prevPhase === "loading" ? "app-speaking" : prevPhase,
      );
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
    setShowHelper(false);
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
          {currentLine?.is_review && (
            <span
              title="Review line from previous day"
              style={{ marginLeft: "6px" }}
            >
              🔁 Review
            </span>
          )}
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
          <div
            className={`line-card app-line win ${currentLine.is_review ? "review-line" : ""}`}
          >
            <WinBar
              label={currentLine.is_review ? "app.tts (review)" : "app.tts"}
              tone={currentLine.is_review ? "orange" : "purple"}
            />
            <div className="line-card-body">
              <div className="line-speaker">
                🤖 App{" "}
                {currentLine.is_review && (
                  <span
                    style={{
                      fontSize: "0.85em",
                      marginLeft: "8px",
                      color: "#ff9800",
                    }}
                  >
                    🔁 Review
                  </span>
                )}
              </div>
              <p className="line-turkish">{currentLine.turkish}</p>
              {currentLine.slow_phonetic && (
                <p className="line-phonetic">{currentLine.slow_phonetic}</p>
              )}
              {currentLine.english && (
                <p className="line-english">{currentLine.english}</p>
              )}
              <button
                className="btn-retro btn-retro--ghost btn-retro--sm btn-slow"
                onClick={handleSlowPlay}
              >
                🐢 Slow
              </button>
            </div>
          </div>
        )}

        {/* User prompt */}
        {currentLine.speaker === "user" && (
          <div
            className={`line-card user-line win ${currentLine.is_review ? "review-line" : ""}`}
          >
            <WinBar
              label={
                currentLine.is_review
                  ? "your-turn.mic (review)"
                  : "your-turn.mic"
              }
              tone={currentLine.is_review ? "orange" : "pink"}
            />
            <div className="line-card-body">
              <div className="line-speaker-row">
                <div className="line-speaker">
                  🎤 You{" "}
                  {currentLine.is_review && (
                    <span
                      style={{
                        fontSize: "0.85em",
                        marginLeft: "8px",
                        color: "#ff9800",
                      }}
                    >
                      🔁 Review
                    </span>
                  )}
                  {currentLine.expected_response && (
                    <span className="expected-response">
                      {" "}
                      — Say: {currentLine.expected_response}
                    </span>
                  )}
                </div>
                {/* Hamburger menu button */}
                <button
                  className={`btn-helper-menu ${showHelper ? "active" : ""}`}
                  onClick={() => setShowHelper(!showHelper)}
                  title="Show helper tips"
                >
                  ☰
                </button>
              </div>

              {/* Helper menu - collapsible */}
              {showHelper && (
                <div className="helper-menu">
                  <p className="helper-title">📚 Need Helper?</p>

                  {/* Show pronunciation hint (correction_hint) */}
                  {helperLineData?.correction_hint && (
                    <div className="helper-item">
                      <p className="helper-label">🗣️ Pronunciation:</p>
                      <p className="helper-content">
                        {helperLineData.correction_hint}
                      </p>
                    </div>
                  )}

                  {/* Show meaning/translation (user_prompt without "say:") */}
                  {helperLineData?.user_prompt && (
                    <div className="helper-item">
                      <p className="helper-label">📖 Meaning:</p>
                      <p className="helper-content">
                        {helperLineData.user_prompt.replace(/^say:\s*/i, "")}
                      </p>
                    </div>
                  )}

                  {/* Show common mispronunciations */}
                  {helperLineData?.mispronunciations &&
                    helperLineData.mispronunciations.length > 0 && (
                      <div className="helper-item">
                        <p className="helper-label">❌ Avoid:</p>
                        <p className="helper-content">
                          {helperLineData.mispronunciations.join(", ")}
                        </p>
                      </div>
                    )}
                </div>
              )}

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

              {/* Show expected response */}
              <div className="result-helper">
                <p className="result-label">Expected:</p>
                <p className="result-value">{lastResult.expected}</p>
              </div>

              {/* Show meaning/translation */}
              {currentLine?.english && (
                <div className="result-helper">
                  <p className="result-label">📖 Meaning:</p>
                  <p className="result-value">{currentLine.english}</p>
                </div>
              )}

              {/* Show pronunciation hint */}
              {currentLine?.slow_phonetic && (
                <div className="result-helper">
                  <p className="result-label">🗣️ Pronunciation:</p>
                  <p className="result-value">{currentLine.slow_phonetic}</p>
                </div>
              )}

              <button
                className="btn-retro btn-retro--mint btn-next"
                onClick={handleNext}
              >
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

              {/* Show expected response */}
              <div className="result-helper">
                <p className="result-label">Expected:</p>
                <p className="result-value">{lastResult.expected}</p>
              </div>

              {/* Show meaning/translation */}
              {currentLine?.english && (
                <div className="result-helper">
                  <p className="result-label">📖 Meaning:</p>
                  <p className="result-value">{currentLine.english}</p>
                </div>
              )}

              {/* Show pronunciation hint */}
              {currentLine?.slow_phonetic && (
                <div className="result-helper">
                  <p className="result-label">🗣️ Pronunciation:</p>
                  <p className="result-value">{currentLine.slow_phonetic}</p>
                </div>
              )}

              {/* Show correction hint */}
              {lastResult.correction_hint && (
                <div className="result-helper">
                  <p className="result-label">💡 Hint:</p>
                  <p className="result-value">{lastResult.correction_hint}</p>
                </div>
              )}

              {/* Show common mispronunciations */}
              {lastResult.mispronunciations &&
                lastResult.mispronunciations.length > 0 && (
                  <div className="result-helper">
                    <p className="result-label">❌ Avoid:</p>
                    <p className="result-value">
                      {lastResult.mispronunciations.join(", ")}
                    </p>
                  </div>
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
              <button
                className="btn-retro btn-retro--pink btn-retro--sm"
                onClick={() => setErrorMessage("")}
              >
                Dismiss
              </button>
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
