export const ROLES = {
  STUDENT: "student",
  FACULTY: "faculty",
  LAB_STAFF: "lab_staff",
  OTHERS: "others",
  HOD: "hod", // kept for backward-compat, not used for HoD assignment
  LAB_COORDINATOR: "lab_coordinator", // Faculty member assigned as department lab coordinator
  ADMIN: "admin",
} as const

export type Role = typeof ROLES[keyof typeof ROLES]
