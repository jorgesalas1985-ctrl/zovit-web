"use client";

import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MyCredentialPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user?.id) {
      router.replace(`/credencial/${user.id}`);
    }
  }, [user, loading, router]);

  return (
    <Protected>
      <div className="centerState">Cargando credencial…</div>
    </Protected>
  );
}
