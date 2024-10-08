import { BrainRoleAssignation } from "../../BrainUsers/types";

export const generateBrainAssignation = (): BrainRoleAssignation => {
  return {
    email: "",
    role: "Owner",
    id: Math.random().toString(),
  };
};
