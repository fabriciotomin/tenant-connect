import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

/**
 * Landing page for admin_global or users without a direct slug.
 * Shows list of companies the user can access.
 */
export default function SelectTenant() {
  const { user, loading: authLoading } = useAuth();
  const { profile, isAdminGlobal, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    const fetchEmpresas = async () => {
      if (isAdminGlobal) {
        const { data } = await supabase
          .from("empresas")
          .select("id, slug, razao_social, nome_fantasia, status")
          .eq("status", "ativo")
          .order("razao_social");
        const list = data || [];
        // Auto-redirect to first empresa if only one or to avoid blank screen
        if (list.length === 1) {
          navigate(`/t/${list[0].slug}`, { replace: true });
          return;
        }
        setEmpresas(list);
      } else if (profile?.tenant_id) {
        const { data } = await supabase
          .from("empresas")
          .select("id, slug, razao_social, nome_fantasia, status")
          .eq("id", profile.tenant_id)
          .single();
        if (data?.slug) {
          navigate(`/t/${data.slug}`, { replace: true });
          return;
        }
      } else {
        // Fallback: user has no tenant_id, try first active empresa
        const { data } = await supabase
          .from("empresas")
          .select("id, slug")
          .eq("status", "ativo")
          .order("razao_social")
          .limit(1)
          .single();
        if (data?.slug) {
          navigate(`/t/${data.slug}`, { replace: true });
          return;
        }
      }
      setLoading(false);
    };

    fetchEmpresas();
  }, [user, authLoading, profileLoading, isAdminGlobal, profile]);

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-2">
          <Building2 className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-xl font-semibold">Selecione a Empresa</h1>
          <p className="text-sm text-muted-foreground">Escolha a empresa que deseja acessar</p>
        </div>
        <div className="space-y-2">
          {empresas.map((e) => (
            <Card
              key={e.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/t/${e.slug}`)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{e.razao_social}</p>
                  {e.nome_fantasia && (
                    <p className="text-xs text-muted-foreground">{e.nome_fantasia}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {empresas.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Nenhuma empresa disponível.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
