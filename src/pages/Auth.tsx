import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const navigate = useNavigate();

  const tenantCtx = (() => {
    try {
      return useTenant();
    } catch {
      return { tenant: null, tenantLoading: false, tenantError: null, slug: undefined };
    }
  })();

  const { tenant, tenantLoading, tenantError } = tenantCtx;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Check profile status
        const { data: profileData } = await supabase
          .from("profiles")
          .select("tenant_id, status")
          .eq("auth_id", data.user.id)
          .single();

        const profileStatus = (profileData as any)?.status;

        if (profileStatus === 'PENDENTE_APROVACAO') {
          // Check if admin_global (they bypass)
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id);
          const isGlobal = roles?.some((r) => r.role === "admin_global");

          if (!isGlobal) {
            await supabase.auth.signOut();
            toast.error("Seu cadastro está aguardando aprovação do administrador.");
            setLoading(false);
            return;
          }
        }

        if (tenant) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id);

          const isGlobal = roles?.some((r) => r.role === "admin_global");

          if (!isGlobal && profileData?.tenant_id !== tenant.id) {
            await supabase.auth.signOut();
            toast.error("Usuário não pertence a esta empresa.");
            setLoading(false);
            return;
          }

          toast.success("Login realizado com sucesso!");
          navigate(`/t/${tenant.slug}`);
        } else {
          toast.success("Login realizado com sucesso!");
          navigate("/");
        }
      } else {
        const metadata: Record<string, string> = { nome };
        if (tenant) {
          metadata.tenant_id = tenant.id;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: window.location.origin + (tenant ? `/t/${tenant.slug}/auth` : '/auth'),
          },
        });
        if (error) throw error;

        setSignupDone(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando empresa...</div>
      </div>
    );
  }

  if (tenantError && tenantCtx.slug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold">Empresa não encontrada</h1>
          <p className="text-sm text-muted-foreground">{tenantError}</p>
        </div>
      </div>
    );
  }

  // Success state after signup
  if (signupDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <CardTitle className="text-xl">Cadastro enviado!</CardTitle>
            <CardDescription className="text-sm">
              Seu cadastro foi recebido com sucesso. Um administrador irá analisar e aprovar seu acesso.
              Você será notificado quando sua conta for ativada.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" size="sm" onClick={() => { setSignupDone(false); setIsLogin(true); }}>
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">
            {tenant
              ? `${isLogin ? "Entrar" : "Criar conta"} — ${tenant.nome_fantasia || tenant.razao_social}`
              : isLogin ? "Entrar no ERP" : "Criar conta"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Entre com suas credenciais para acessar o sistema"
              : "Preencha os dados para solicitar acesso"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-xs">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" required={!isLogin} className="h-9" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-9" />
            </div>
            <Button type="submit" className="w-full h-9" disabled={loading}>
              {loading ? "Aguarde..." : isLogin ? "Entrar" : "Solicitar acesso"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              {isLogin ? "Não tem conta? Solicitar acesso" : "Já tem conta? Entrar"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
