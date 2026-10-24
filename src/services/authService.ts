import { api } from "./api";
import type { User } from "../types/user";
export const authService = {
  login: (gmail: string, password: string) =>
    api<{ token: string }>("/users/login", {
      method: "POST",
      body: JSON.stringify({ gmail, password }),
    }),
  me: () => api<User>("/users/me"),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api<{ avatar: string }>("/users/avatar", {
      method: "PATCH",
      body: formData,
    });
  },
};
