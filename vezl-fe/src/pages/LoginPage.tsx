import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@heroui/react";
import { useAuth } from "@/contexts/AuthContext";

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
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-[380px] bg-surface-elevated border border-border rounded-xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">vezl</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onValueChange={setEmail}
            variant="bordered"
            classNames={{
              input: "bg-surface-raised text-text-primary",
              inputWrapper: "bg-surface-raised border-border hover:border-border-strong data-[focus=true]:border-accent",
              label: "text-text-secondary",
            }}
            isRequired
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onValueChange={setPassword}
            variant="bordered"
            classNames={{
              input: "bg-surface-raised text-text-primary",
              inputWrapper: "bg-surface-raised border-border hover:border-border-strong data-[focus=true]:border-accent",
              label: "text-text-secondary",
            }}
            isRequired
          />
          {error && (
            <p className="text-xs text-[#f31260]">{error}</p>
          )}
          <Button
            type="submit"
            color="primary"
            className="w-full font-medium"
            radius="full"
            isLoading={loading}
          >
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
