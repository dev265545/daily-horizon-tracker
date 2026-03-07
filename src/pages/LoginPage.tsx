import { useState } from "react";
import { Factory } from "lucide-react";

interface LoginPageProps {
  onLogin: (password: string) => Promise<boolean>;
  error: string;
}

const LoginPage = ({ onLogin, error }: LoginPageProps) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(password.trim());
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm section-card animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Factory className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">ProdTrack</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Enter password to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="loginPassword" className="form-label">Password</label>
            <input
              type="password"
              id="loginPassword"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input w-full"
              placeholder="Password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
