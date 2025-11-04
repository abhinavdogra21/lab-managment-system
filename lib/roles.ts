export const ROLES = {
  STUDENT: "student",
  FACULTY: "faculty",
  LAB_STAFF: "lab_staff",
  OTHERS: "others",
  NON_TEACHING: "non_teaching",
  HOD: "hod", // kept for backward-compat, not used for HoD assignment
  ADMIN: "admin",
} as const

export type Role = typeof ROLES[keyof typeof ROLES]
