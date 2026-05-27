"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, resetPassword } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [signInState, signInAction, signInPending] = useActionState(signIn, null);
  const [resetState, resetAction, resetPending] = useActionState(resetPassword, null);
  const [showPassword, setShowPassword] = useState(false);

  if (mode === "forgot") {
    const success = resetState && "success" in resetState;
    return (
      <div className="space-y-4">
        {success ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              ✅ {resetState.success}
            </p>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <form action={resetAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                required
                placeholder="voluntario@email.com"
                className="h-11"
              />
            </div>

            {"error" in (resetState ?? {}) && (
              <p className="text-sm text-destructive" role="alert">
                {(resetState as { error: string }).error}
              </p>
            )}

            <Button
              type="submit"
              disabled={resetPending}
              className="w-full h-11 rounded-full font-medium"
            >
              {resetPending ? "Enviando…" : "Enviar instruções"}
            </Button>

            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <form action={signInAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          placeholder="voluntario@email.com"
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Esqueci minha senha
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {signInState && "error" in signInState && (
        <p className="text-sm text-destructive" role="alert">
          {signInState.error}
        </p>
      )}

      {/* Show error from login page query param (expired link, etc.) */}
      <Button
        type="submit"
        disabled={signInPending}
        className="w-full h-11 rounded-full font-medium"
      >
        {signInPending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
