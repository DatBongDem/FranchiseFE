import { api, collection, normalize } from "./api";
import type { Role } from "../types/user";

export interface CreateUserPayload {
  name: string;
  gmail: string;
  password: string;
  role: Role;
  phoneNumber?: string;
  address?: string;
  gender?: string;
  idStore?: string;
}

export interface UpdateUserPayload {
  name?: string;
  phoneNumber?: string;
  address?: string;
  gender?: string;
  idStore?: string;
  role?: Role;
}

export const userManageService = {
  create: (payload: CreateUserPayload) =>
    api("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateUserPayload) =>
    api(`/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    api(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
