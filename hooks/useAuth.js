import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          setUserId(currentUser.uid);
        } else {
          if (initialAuthToken) {
            try {
              await signInWithCustomToken(auth, initialAuthToken);
            } catch (error) {
              console.error("Error signing in with custom token:", error);
              await signInAnonymously(auth);
            }
          } else {
            await signInAnonymously(auth);
          }
          setUser(auth.currentUser);
          setUserId(auth.currentUser?.uid || crypto.randomUUID());
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setIsAuthReady(true);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const auth = getFirebaseAuth();
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password) => {
    const auth = getFirebaseAuth();
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    return signOut(auth);
  };

  return {
    user,
    userId,
    isAuthReady,
    loading,
    login,
    register,
    logout,
  };
};