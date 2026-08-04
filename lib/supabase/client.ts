import { createBrowserClient } from "@supabase/ssr";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url, key };
}

function createNoopClient() {
  const query = {
    select() {
      return query;
    },
    insert() {
      return query;
    },
    update() {
      return query;
    },
    upsert() {
      return query;
    },
    delete() {
      return query;
    },
    eq() {
      return query;
    },
    in() {
      return query;
    },
    order() {
      return query;
    },
    limit() {
      return query;
    },
    range() {
      return query;
    },
    gte() {
      return query;
    },
    lte() {
      return query;
    },
    gt() {
      return query;
    },
    lt() {
      return query;
    },
    ilike() {
      return query;
    },
    or() {
      return query;
    },
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
    },
    from() {
      return query;
    },
    rpc: async () => ({ data: null, error: null }),
  };
}

export function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    return createNoopClient();
  }

  const { url, key } = env;
  return createBrowserClient(url, key);
}

export const supabase = createClient();
