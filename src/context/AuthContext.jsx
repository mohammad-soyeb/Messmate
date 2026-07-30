import {
  createContext,
  useEffect,
  useState,
} from "react";
import {
  isSupabaseConfigured,
  requireSupabase,
} from "../lib/supabase";

export const AuthContext = createContext();

const getAccountUser = async (authUser) => {
  if (!authUser) {
    return null;
  }

  const client = requireSupabase();
  const { data: profile, error } = await client
    .from("profiles")
    .select("full_name, phone, room")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    id: authUser.id,
    name:
      profile?.full_name ||
      authUser.user_metadata?.full_name ||
      "",
    email: authUser.email || "",
    phone: profile?.phone || "",
    room: profile?.room || "",
  };
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] =
    useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return undefined;
    }

    const client = requireSupabase();
    let active = true;

    const restoreSession = async () => {
      try {
        const {
          data: { session },
        } = await client.auth.getSession();
        const restoredUser = await getAccountUser(
          session?.user
        );

        if (active) {
          setUser(restoredUser);
        }
      } catch (error) {
        console.error(
          "Unable to restore session:",
          error
        );
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(
      (_event, session) => {
        window.setTimeout(async () => {
          try {
            const nextUser = await getAccountUser(
              session?.user
            );

            if (active) {
              setUser(nextUser);
            }
          } catch (error) {
            console.error(
              "Unable to refresh session:",
              error
            );
          } finally {
            if (active) {
              setAuthLoading(false);
            }
          }
        }, 0);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const register = async ({
    name,
    email,
    password,
  }) => {
    const client = requireSupabase();
    const { data, error } =
      await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

    if (error) {
      throw error;
    }

    if (data.session) {
      setUser(await getAccountUser(data.user));
    }

    return {
      requiresConfirmation: !data.session,
      email: data.user?.email,
    };
  };

  const login = async (email, password) => {
    const client = requireSupabase();
    const { data, error } =
      await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      throw error;
    }

    setUser(await getAccountUser(data.user));
    return true;
  };

  const logout = async () => {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }

    setUser(null);
  };

  const updateProfile = async (updatedUser) => {
    const client = requireSupabase();
    const authUpdates = {
      data: {
        full_name: updatedUser.name.trim(),
      },
    };

    if (
      updatedUser.email.trim() &&
      updatedUser.email.trim() !== user?.email
    ) {
      authUpdates.email = updatedUser.email.trim();
    }

    const { data, error: authError } =
      await client.auth.updateUser(authUpdates);

    if (authError) {
      throw authError;
    }

    const { error: profileError } = await client
      .from("profiles")
      .upsert({
        id: data.user.id,
        full_name: updatedUser.name.trim(),
        phone: updatedUser.phone.trim() || null,
        room: updatedUser.room.trim() || null,
      });

    if (profileError) {
      throw profileError;
    }

    const nextUser = await getAccountUser(data.user);
    setUser(nextUser);
    return nextUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        isSupabaseConfigured,
        register,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
