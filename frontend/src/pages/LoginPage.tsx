import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api";
import { useAuthStore } from "../store/auth.store";
import WinBar from "../components/WinBar";
import RetroScene from "../components/RetroScene";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ email, password });
      setToken(res.data.access_token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <RetroScene variant="day" />
      <div className="auth-card win">
        <WinBar label="login.exe" tone="purple" />
        <div className="auth-card-body">
          <div className="brand-row">
            <h1>🇹🇷 Turkish Practice</h1>
          </div>
          <h2>Welcome back</h2>
          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            {error && <p className="error">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-retro btn-retro--purple btn-retro--block"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
