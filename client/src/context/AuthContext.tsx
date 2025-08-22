import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User as FirebaseUser, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User } from "@shared/schema";
import { getUserByFirebaseUid } from "@/services/firestore";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      try {
        const userDoc = await getUserByFirebaseUid(currentUser.uid);
        setUserData(userDoc);
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    }
  }, [currentUser]);

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const userDoc = await getUserByFirebaseUid(user.uid);
          setUserData(userDoc);
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    logout,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}