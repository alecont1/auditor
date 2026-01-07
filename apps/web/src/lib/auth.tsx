import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST';
  companyId: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  tokenBalance: number | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshTokenBalance: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      // TODO: Fetch user data with token
      fetchUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchTokenBalance = async (authToken: string) => {
    try {
      const response = await fetch('/api/tokens/balance', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTokenBalance(data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
    }
  };

  const refreshTokenBalance = async () => {
    if (token) {
      await fetchTokenBalance(token);
    }
  };

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // Also fetch token balance after getting user
        await fetchTokenBalance(authToken);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('auth_token');
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.token);
    // Fetch token balance after login
    await fetchTokenBalance(data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setTokenBalance(null);
    localStorage.removeItem('auth_token');
    // Optional: Call logout endpoint
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {
      // Ignore errors on logout
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        tokenBalance,
        isLoading,
        login,
        logout,
        refreshTokenBalance,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
