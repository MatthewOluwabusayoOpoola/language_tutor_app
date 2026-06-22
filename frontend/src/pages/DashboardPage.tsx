import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProgress, getProfile } from "../api";
import type { AllProgress, User } from "../types";
import { useAuthStore } from "../store/auth.store";
import WinBar from "../components/WinBar";

const MAX_DAYS = 3;

export default function DashboardPage() {
  const [progress, setProgress] = useState<AllProgress | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  useEffect(() => {
    Promise.all([getAllProgress(), getProfile()]).then(([p, u]) => {
      setProgress(p.data);
      setUser(u.data);
    });
  }, []);

  const handleMode = (mode: "normal" | "romantic") => {
    if (mode === "romantic" && !progress?.romantic_unlocked) return;
    navigate(`/conversation/${mode}`);
  };

  if (!progress || !user) return <div className="loading">Loading...</div>;

  const normalDaysCompleted = progress.normal.completed_days_json.length;
  const romanticDaysCompleted = progress.romantic.completed_days_json.length;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🇹🇷 Turkish Practice</h1>
        <div className="header-right">
          <span>Merhaba, {user.name}!</span>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="btn-retro btn-retro--ghost btn-retro--sm"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2>Choose your practice mode</h2>

        <div className="mode-cards">
          {/* Normal Mode */}
          <div
            className="mode-card win"
            onClick={() => handleMode("normal")}
          >
            <WinBar label="everyday.app" tone="white" />
            <div className="mode-card-body">
              <div className="mode-icon">💬</div>
              <h3>Everyday Conversation</h3>
              <p>
                Learn to introduce yourself, talk about your life, and navigate
                daily Turkish conversations.
              </p>
              <div className="progress-bar-wrap">
                <div className="progress-bar-label">
                  <span>
                    Day {progress.normal.current_day} of {MAX_DAYS}
                  </span>
                  <span className="mono-pill">
                    {normalDaysCompleted}/{MAX_DAYS}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${(normalDaysCompleted / MAX_DAYS) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <button className="btn-retro btn-retro--purple btn-start">
                {normalDaysCompleted >= MAX_DAYS
                  ? "✅ Complete! Review"
                  : `Continue Day ${progress.normal.current_day}`}
              </button>
            </div>
          </div>

          {/* Romantic Mode */}
          <div
            className={`mode-card win ${!progress.romantic_unlocked ? "locked" : ""}`}
            onClick={() => handleMode("romantic")}
          >
            <WinBar label="romantic.app" tone="pink" />
            <div className="mode-card-body">
              <div className="mode-icon">
                {progress.romantic_unlocked ? "❤️" : "🔒"}
              </div>
              <h3>Romantic Conversation</h3>
              {progress.romantic_unlocked ? (
                <>
                  <p>
                    Practice expressing affection and deeper connection in
                    Turkish.
                  </p>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-label">
                      <span>
                        Day {progress.romantic.current_day} of {MAX_DAYS}
                      </span>
                      <span className="mono-pill">
                        {romanticDaysCompleted}/{MAX_DAYS}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill romantic"
                        style={{
                          width: `${(romanticDaysCompleted / MAX_DAYS) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <button className="btn-retro btn-retro--pink btn-start">
                    {romanticDaysCompleted >= MAX_DAYS
                      ? "✅ Complete! Review"
                      : `Continue Day ${progress.romantic.current_day}`}
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Complete all 3 days of Everyday Conversation to unlock this
                    mode.
                  </p>
                  <div className="unlock-hint">
                    🔓 {normalDaysCompleted}/{MAX_DAYS} days completed
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
