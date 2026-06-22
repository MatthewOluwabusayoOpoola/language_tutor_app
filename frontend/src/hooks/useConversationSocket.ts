import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { PronunciationResult } from "../types";

interface UseConversationSocketOptions {
  onTtsAudio: (audio: string, slow: boolean) => void;
  onPronunciationResult: (result: PronunciationResult) => void;
  onError: (message: string) => void;
  onTtsEnd?: () => void; // called when local speechSynthesis finishes
}

export function useConversationSocket(options: UseConversationSocketOptions) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.warn(
        "Socket auth missing: access_token not found in localStorage. Conversation socket will not connect.",
      );
      optionsRef.current.onError(
        "Socket auth missing: you must be logged in to use conversation features.",
      );
      setConnected(false);
      return;
    }

    const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:3000", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    const updateConnectedState = () => {
      console.log(
        `[Socket] Connection state check: connected=${socket.connected}`,
      );
      setConnected(socket.connected);
    };

    socket.on("connect", () => {
      console.log("[Socket] Connected successfully");
      setConnected(true);
    });
    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setConnected(false);
    });
    socket.on("connect_error", (err: Error) => {
      console.error("[Socket] Connection error:", err.message);
      setConnected(false);
    });

    // Poll connection state every 2 seconds as fallback
    const pollInterval = setInterval(updateConnectedState, 2000);

    socket.on(
      "tts-audio",
      ({ audio, slow }: { audio: string; slow: boolean }) => {
        optionsRef.current.onTtsAudio(audio, slow);
      },
    );

    socket.on("pronunciation-result", (result: PronunciationResult) => {
      optionsRef.current.onPronunciationResult(result);
    });

    socket.on("error", ({ message }: { message: string }) => {
      optionsRef.current.onError(message);
    });

    socket.on(
      "tts-error",
      ({ message, error }: { message: string; error?: string }) => {
        optionsRef.current.onError(`${message}${error ? `: ${error}` : ""}`);
      },
    );

    socketRef.current = socket;
    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, []);

  const requestTts = useCallback(
    (text: string, slow = false) => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          const utt: any = new (window as any).SpeechSynthesisUtterance(text);
          utt.lang = "tr-TR";
          utt.rate = slow ? 0.65 : 1.0;
          utt.onend = () => {
            optionsRef.current.onTtsEnd?.();
          };
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utt);
          return;
        } catch (e) {
          console.warn(
            "Local speechSynthesis failed, falling back to server TTS",
            e,
          );
        }
      }

      if (!socketRef.current || !connected) {
        optionsRef.current.onError(
          "Cannot request TTS because the socket is not connected.",
        );
        return;
      }

      socketRef.current.emit("request-tts", { text, slow });
    },
    [connected],
  );

  const sendAudio = useCallback(
    (audioBase64: string, mode: string, day: number, lineNumber: number) => {
      if (!socketRef.current || !connected) {
        optionsRef.current.onError(
          "Cannot send audio because the socket is not connected.",
        );
        return;
      }
      socketRef.current.emit("audio-stream", {
        audio: audioBase64,
        mode,
        day,
        line_number: lineNumber,
      });
    },
    [connected],
  );

  const submitTranscript = useCallback(
    (transcript: string, mode: string, day: number, lineNumber: number) => {
      if (!socketRef.current || !connected) {
        optionsRef.current.onError(
          "Cannot submit transcript because the socket is not connected.",
        );
        return;
      }
      socketRef.current.emit("submit-transcript", {
        transcript,
        mode,
        day,
        line_number: lineNumber,
      });
    },
    [connected],
  );

  return { requestTts, sendAudio, submitTranscript, connected };
}
