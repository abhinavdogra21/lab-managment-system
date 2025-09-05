export const ROLES = {
  STUDENT: "student",
  FACULTY: "faculty",
  LAB_STAFF: "lab_staff",
  NON_TEACHING: "non_teaching",
  ADMIN: "admin",
  TNP: "tnp",
  HOD: "hod", // kept for backward-compat, not used for HOD assignment
} as const

export type Role = typeof ROLES[keyof typeof ROLES]
