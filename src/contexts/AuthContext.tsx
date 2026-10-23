import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService } from "../services/authService";
import { roles, type User } from "../types/user";
interface Auth {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const Context = createContext<Auth | null>(null);
function validate(user: User) {
  if (!roles.includes(user.role))
    throw new Error("Vai trò tài khoản chưa được hỗ trợ.");
  return user;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const logout = () => {
    sessionStorage.removeItem("franchise.token");
    setUser(null);
  };
  useEffect(() => {
    let active = true;
    if (sessionStorage.getItem("franchise.token"))
      authService
        .me()
        .then((me) => {
          if (active) setUser(validate(me));
        })
        .catch(() => {
          if (active) logout();
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    else setLoading(false);
    const expire = () => logout();
    window.addEventListener("session-expired", expire);
    return () => {
      active = false;
      window.removeEventListener("session-expired", expire);
    };
  }, []);
  async function login(email: string, password: string) {
    const result = await authService.login(email, password);
    sessionStorage.setItem("franchise.token", result.token);
    try {
      setUser(validate(await authService.me()));
    } catch (error) {
      logout();
      throw error;
    }
  }
  return (
    <Context.Provider value={{ user, loading, login, logout }}>
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AuthProvider");
  return value;
}
