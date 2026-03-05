import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UserProfile {
  id: string;
  tenant_id: string | null;
  nome: string;
  email: string;
  status: string;
}

interface UserRole {
  role: "admin_global" | "admin_empresa" | "usuario";
}

export function useUserProfile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, tenant_id, nome, email, deleted_at, status")
        .eq("auth_id", user.id)
        .single();

      // If profile is soft-deleted, force sign out
      if (!profileData || profileData.deleted_at) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
        await signOut();
        return;
      }

      setProfile({
        id: profileData.id,
        tenant_id: profileData.tenant_id,
        nome: profileData.nome,
        email: profileData.email,
        status: (profileData as any).status || 'PENDENTE_APROVACAO',
      });

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesData) {
        setRoles(rolesData as UserRole[]);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const isAdminGlobal = roles.some((r) => r.role === "admin_global");

  const isAdminEmpresa = (tenantId?: string) =>
    roles.some((r) => r.role === "admin_empresa");

  const isActive = profile?.status === 'ATIVO';
  const isPending = profile?.status === 'PENDENTE_APROVACAO';

  return { profile, roles, isAdminGlobal, isAdminEmpresa, isActive, isPending, loading };
}
