import { authService } from "@/lib/auth";

export interface InternshipApplicationPayload {
  name: string;
  email: string;
  phone: string;
  collegeName: string;
  branch: string;
  semester: string;
  type: "Hardware" | "Software";
  mode: "Hybrid" | "Onsite" | "Online";
  duration: string;
  preferredLocation?: string;
  internshipType: "Free" | "Stipend";
  additionalNotes?: string;
  resumeBase64?: string;
  resumeFileName?: string;
  resumeContentType?: string;
  resumeUrl?: string;
  source?: string;
  userId?: string | null;
}

const jsonHeaders = () => ({
  "Content-Type": "application/json",
});

export const submitInternshipApplication = async (
  payload: InternshipApplicationPayload
) => {
  const response = await fetch("/api/internships/apply", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to submit application");
  }

  return response.json();
};

export const fetchInternshipApplications = async () => {
  const response = await fetch("/api/internships", {
    headers: {
      ...jsonHeaders(),
      ...authService.getAuthHeaders(),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to load applications");
  }
  return response.json();
};

export const deleteInternshipApplication = async (id: string) => {
  const response = await fetch(`/api/internships/${id}`, {
    method: "DELETE",
    headers: {
      ...jsonHeaders(),
      ...authService.getAuthHeaders(),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to delete application");
  }
  return response.json();
};

