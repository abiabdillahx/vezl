import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@heroui/react";
import { useAuth } from "@/contexts/AuthContext";
import { inputClassNames } from "@/components/styles";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/links", { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-canvas-soft dark:bg-canvas flex items-center justify-center px-4">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-[400px] bg-surface-elevated border border-border rounded-xl p-10 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/vezl.png" alt="" className="w-11 h-11 rounded-lg mb-4 dark:ring-1 dark:ring-border-strong" />
          <h1 className="text-[28px] font-semibold text-text-primary tracking-display">vezl</h1>
          <p className="text-[15px] text-text-secondary mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onValueChange={setEmail}
            variant="bordered"
            classNames={inputClassNames}
            isRequired
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onValueChange={setPassword}
            variant="bordered"
            classNames={inputClassNames}
            isRequired
          />
          {error && (
            <p className="text-[13px] text-danger">{error}</p>
          )}
          <Button
            type="submit"
            color="primary"
            size="lg"
            radius="md"
            className="w-full font-medium"
            isLoading={loading}
          >
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
