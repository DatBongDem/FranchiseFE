export const roles = [
  "ADMIN",
  "MANAGER",
  "STORESTAFF",
  "KITCHENSTAFF",
  "SUPPLYCOORDINATOR",
] as const;
export type Role = (typeof roles)[number];
export interface User {
  id: string;
  name: string;
  gmail: string;
  role: Role;
  idStore?: string;
  avatar?: string;
  status?: string;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
}
export const roleLabels: Record<Role, string> = {
  ADMIN: "Quản trị hệ thống",
  MANAGER: "Quản lý cửa hàng",
  STORESTAFF: "Nhân viên cửa hàng",
  KITCHENSTAFF: "Nhân viên bếp",
  SUPPLYCOORDINATOR: "Điều phối cung ứng",
};
