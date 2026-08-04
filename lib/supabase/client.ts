import { createBrowserClient } from "@supabase/ssr";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

function createNoopClient(): ReturnType<typeof createBrowserClient> {
  const response = { data: null, error: null, count: 0 };
  const query = {
    then(resolve: (value: typeof response) => unknown) {
      return Promise.resolve(response).then(resolve);
    },
    catch(reject: (reason?: unknown) => unknown) {
      return Promise.resolve(response).catch(reject);
    },
    finally(onFinally: () => void) {
      return Promise.resolve(response).finally(onFinally);
    },
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
    maybeSingle: async () => response,
    single: async () => response,
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      exchangeCodeForSession: async () => ({ data: { user: null, session: null }, error: null }),
    },
    from() {
      return query;
    },
    rpc: async () => ({ data: null, error: null, count: 0 }),
    storage: {
      from() {
        return {
          upload: async () => ({ data: null, error: null }),
          remove: async () => ({ data: null, error: null }),
          createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        };
      },
    },
    channel() {
      return {
        on(..._args: unknown[]) {
          return this;
        },
        subscribe() {
          return Promise.resolve({ status: "SUBSCRIBED" });
        },
        unsubscribe() {
          return Promise.resolve();
        },
      } as unknown as ReturnType<typeof createBrowserClient>["channel"];
    },
  } as unknown as ReturnType<typeof createBrowserClient>;
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
