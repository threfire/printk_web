export const genderOptions = ["男", "女", "其他"] as const;
export const gradeOptions = ["大一", "大二", "大三", "大四", "研究生"] as const;
export const memberStatusOptions = ["非战队队员", "梯队队员", "正式队员", "兵种组长", "队长", "管理员", "老队员", "退役队员", "老师"] as const;
export const departmentOptions = ["电控", "机械", "算法", "运营"] as const;

export type SiteAccountProfile = {
  account: string;
  full_name: string;
  gender: string;
  grade: string;
  member_status: string;
  department: string;
  phone: string;
  email: string;
  bio: string;
  reward_score: number;
  reward_eligible: boolean;
  image2_allowed: boolean;
  is_disabled: boolean;
  admin_note?: string;
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
};

export function profileFromForm(formData: FormData) {
  return {
    full_name: String(formData.get("full_name") ?? "").trim(),
    gender: String(formData.get("gender") ?? "").trim(),
    grade: String(formData.get("grade") ?? "").trim(),
    member_status: String(formData.get("member_status") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
  };
}
