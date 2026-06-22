import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, getCountries, getCities } from "../api";
import { useAuthStore } from "../store/auth.store";
import type { Country, City } from "../types";
import WinBar from "../components/WinBar";
import RetroScene from "../components/RetroScene";

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    country_code: "",
    city_code: "",
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken } = useAuthStore();

  useEffect(() => {
    getCountries().then((res) => setCountries(res.data));
  }, []);

  useEffect(() => {
    if (form.country_code) {
      getCities(form.country_code).then((res) => setCities(res.data));
      setForm((f) => ({ ...f, city_code: "" }));
    }
  }, [form.country_code]);

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await register(form);
      setToken(res.data.access_token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <RetroScene />
      <div className="auth-card win">
        <WinBar label="register.exe" tone="pink" />
        <div className="auth-card-body">
          <div className="brand-row">
            <h1>🇹🇷 Turkish Practice</h1>
          </div>
          <h2>Create your account</h2>
          <form onSubmit={handleSubmit}>
            <label>Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="Your name"
              required
            />

            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••"
              required
              minLength={8}
            />

            <label>Your Country</label>
            <select
              value={form.country_code}
              onChange={set("country_code")}
              required
            >
              <option value="">Select country...</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.english_name}
                </option>
              ))}
            </select>

            <label>Your City</label>
            <select
              value={form.city_code}
              onChange={set("city_code")}
              required
              disabled={!form.country_code}
            >
              <option value="">Select city...</option>
              {cities.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.english_name}
                </option>
              ))}
            </select>

            {error && <p className="error">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-retro btn-retro--pink btn-retro--block"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
