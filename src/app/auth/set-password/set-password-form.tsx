"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setPassword } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function SetPasswordForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(setPassword, null);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Seu nome</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          required
          placeholder="Nome completo"
          className="h-11"
          autoComplete="name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className="h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmar senha</Label>
        <Input
          id="confirm"
          name="confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          required
          placeholder="Repita a senha"
          className="h-11"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full h-11 rounded-full font-medium">
        {pending ? "Salvando…" : "Definir senha e entrar"}
      </Button>
    </form>
  );
}
