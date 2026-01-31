import { useEffect, useMemo, useState, useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { submitInternshipApplication } from "@/lib/internship";
import { ALL_BRANCHES } from "@/constants/branches";
import { UploadCloud, FileText } from "lucide-react";

type InternshipFormVariant = "public" | "dashboard";

const INTERNSHIP_TYPES = [
  { label: "Hardware", value: "Hardware" },
  { label: "Software", value: "Software" },
] as const;

const MODE_OPTIONS = [
  { label: "Hybrid", value: "Hybrid" },
  { label: "Onsite", value: "Onsite" },
  { label: "Online", value: "Online" },
] as const;

const SEMESTERS = ["1", "2", "3", "4", "5", "6"];

const DURATION_OPTIONS = [
  { label: "4 Weeks", value: "4 Weeks" },
  { label: "8 Weeks", value: "8 Weeks" },
  { label: "12 Weeks", value: "12 Weeks" },
  { label: "16 Weeks", value: "16 Weeks" },
  { label: "24 Weeks", value: "24 Weeks" },
] as const;

const INTERNSHIP_CATEGORY = [
  { label: "Free", value: "Free" },
  { label: "Stipend", value: "Stipend" },
] as const;

interface InternshipFormProps {
  variant?: InternshipFormVariant;
  className?: string;
}

interface InternshipFormState {
  name: string;
  email: string;
  phone: string;
  collegeName: string;
  branch: string;
  semester: string;
  type: "Hardware" | "Software";
  mode: "Hybrid" | "Onsite" | "Online";
  duration: string;
  preferredLocation: string;
  internshipType: "Free" | "Stipend";
  additionalNotes: string;
  resumeFile: File | null;
}

const defaultState: InternshipFormState = {
  name: "",
  email: "",
  phone: "",
  collegeName: "",
  branch: "",
  semester: "",
  type: "Software",
  mode: "Online",
  duration: "12 Weeks",
  preferredLocation: "",
  internshipType: "Free",
  additionalNotes: "",
  resumeFile: null,
};

const InternshipForm: React.FC<InternshipFormProps> = ({ variant = "public", className }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  type ExtendedUser = typeof user & { phone?: string; college?: string };
  const currentUser = user as ExtendedUser;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<InternshipFormState>(defaultState);
  const resumeInputId = useId();

  useEffect(() => {
    if (variant === "dashboard" && currentUser) {
      setForm((prev) => ({
        ...prev,
        name: currentUser.name || prev.name,
        email: currentUser.email || prev.email,
        phone: currentUser.phone || prev.phone,
        branch: currentUser.branch || prev.branch,
        semester: currentUser.semester ? String(currentUser.semester) : prev.semester,
        collegeName: currentUser.college || prev.collegeName,
      }));
    }
  }, [currentUser, variant]);

  const isPreferredLocationRequired = useMemo(() => ["Hybrid", "Onsite"].includes(form.mode), [form.mode]);

  const handleChange = (key: keyof InternshipFormState, value: string | File | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleResumeChange = (file: File | null) => {
    if (!file) {
      setForm((prev) => ({ ...prev, resumeFile: null }));
      return;
    }
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file",
        description: "Please upload your resume in PDF format.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Resume must be under 7MB.",
        variant: "destructive",
      });
      return;
    }
    setForm((prev) => ({ ...prev, resumeFile: file }));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const validateForm = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({ title: "Missing required info", description: "Name, email and phone are required.", variant: "destructive" });
      return false;
    }
    if (!form.collegeName.trim() || !form.branch || !form.semester) {
      toast({ title: "Incomplete academics", description: "Please fill college, branch and semester.", variant: "destructive" });
      return false;
    }
    if (isPreferredLocationRequired && !form.preferredLocation.trim()) {
      toast({ title: "Preferred location needed", description: "Provide a preferred location for Hybrid or Onsite mode.", variant: "destructive" });
      return false;
    }
    if (!form.resumeFile) {
      toast({ title: "Resume required", description: "Attach your resume in PDF format.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm() || !form.resumeFile) return;

    try {
      setIsSubmitting(true);
      const resumeBase64 = await fileToBase64(form.resumeFile);
      await submitInternshipApplication({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        collegeName: form.collegeName.trim(),
        branch: form.branch,
        semester: form.semester,
        type: form.type,
        mode: form.mode,
        duration: form.duration,
        preferredLocation: form.preferredLocation.trim(),
        internshipType: form.internshipType,
        additionalNotes: form.additionalNotes.trim(),
        resumeBase64,
        resumeFileName: form.resumeFile.name,
        resumeContentType: form.resumeFile.type,
        source: variant,
        userId: variant === "dashboard" ? user?.id : undefined,
      });

      toast({
        title: "Application submitted",
        description: "We will reach out to you on your email soon.",
      });

      setForm((prev) => ({
        ...defaultState,
        name: variant === "dashboard" && currentUser?.name ? currentUser.name : "",
        email: variant === "dashboard" && currentUser?.email ? currentUser.email : "",
        phone: variant === "dashboard" && currentUser?.phone ? currentUser.phone : "",
        collegeName: variant === "dashboard" && currentUser?.college ? currentUser.college : "",
        branch: variant === "dashboard" && currentUser?.branch ? currentUser.branch : "",
        semester: variant === "dashboard" && currentUser?.semester ? String(currentUser.semester) : "",
      }));
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error?.message || "Unable to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <div className="w-full max-w-2xl">
        {/* Stand-out wrapper (gradient border + glow) */}
        <div className="rounded-3xl bg-gradient-to-br from-fuchsia-500 via-[#673ab7] to-cyan-400 p-[2px] shadow-[0_30px_90px_rgba(103,58,183,0.35)]">
          <Card className="overflow-hidden rounded-[22px] border border-white/60 bg-white shadow-none">
            {/* Google-Forms like top accent bar */}
            <div className="h-3 bg-gradient-to-r from-[#673ab7] via-[#7c3aed] to-[#ec4899]" />

            <CardHeader className="space-y-3 bg-white">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-[#f3e8ff] text-[#673ab7]">
                  {variant === "dashboard" ? "Student account linked" : "No login required"}
                </Badge>
                <Badge className="bg-[#673ab7] text-white hover:bg-[#5e35b1]">Start here</Badge>
                <Badge variant="outline" className="text-slate-500">
                  PDF Resume • 7MB
                </Badge>
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900">Internship Application</CardTitle>
                <p className="mt-2 text-sm text-slate-600">
                  Fill this form to apply for the DigiDiploma internship program. Fields marked with{" "}
                  <span className="text-red-600 font-semibold">*</span> are required.
                </p>
              </div>
            </CardHeader>

            <CardContent className="bg-[#faf7ff] p-4 sm:p-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Contact details */}
              <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#673ab7] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Contact details</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label className="text-slate-800">
                      Name <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Your full name"
                      required
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-800">
                      Email <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-slate-500">We’ll contact you on this email.</p>
                  </div>

                  <div>
                    <Label className="text-slate-800">
                      Phone <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="+91 9876543210"
                      required
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Academic details */}
              <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#673ab7] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Academic details</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label className="text-slate-800">
                      College name <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      value={form.collegeName}
                      onChange={(e) => handleChange("collegeName", e.target.value)}
                      placeholder="Your college name"
                      required
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-800">
                        Branch <span className="text-red-600">*</span>
                      </Label>
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#673ab7]/30">
                        <Select value={form.branch} onValueChange={(value) => handleChange("branch", value)}>
                          <SelectTrigger className="border-0 focus:ring-0">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {ALL_BRANCHES.map((branch) => (
                              <SelectItem key={branch} value={branch}>
                                {branch}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-800">
                        Semester <span className="text-red-600">*</span>
                      </Label>
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#673ab7]/30">
                        <Select value={form.semester} onValueChange={(value) => handleChange("semester", value)}>
                          <SelectTrigger className="border-0 focus:ring-0">
                            <SelectValue placeholder="Select semester" />
                          </SelectTrigger>
                          <SelectContent>
                            {SEMESTERS.map((sem) => (
                              <SelectItem key={sem} value={sem}>
                                Semester {sem}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internship preferences */}
              <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#673ab7] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Internship preferences</p>
                <div className="mt-4 space-y-5">
                  <div>
                    <Label className="text-slate-800">
                      Track <span className="text-red-600">*</span>
                    </Label>
                    <RadioGroup
                      value={form.type}
                      onValueChange={(value: "Hardware" | "Software") => handleChange("type", value)}
                      className="mt-3 space-y-2"
                    >
                      {INTERNSHIP_TYPES.map((item) => (
                        <Label key={item.value} htmlFor={`type-${item.value}`} className="flex items-center gap-3">
                          <RadioGroupItem value={item.value} id={`type-${item.value}`} />
                          <span>{item.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-800">
                        Mode <span className="text-red-600">*</span>
                      </Label>
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#673ab7]/30">
                        <Select value={form.mode} onValueChange={(value: "Hybrid" | "Onsite" | "Online") => handleChange("mode", value)}>
                          <SelectTrigger className="border-0 focus:ring-0">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {MODE_OPTIONS.map((mode) => (
                              <SelectItem key={mode.value} value={mode.value}>
                                {mode.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        If you choose Hybrid/Onsite, we’ll ask for a preferred location.
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-800">
                        Duration <span className="text-red-600">*</span>
                      </Label>
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#673ab7]/30">
                        <Select value={form.duration} onValueChange={(value) => handleChange("duration", value)}>
                          <SelectTrigger className="border-0 focus:ring-0">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATION_OPTIONS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-800">
                      Preferred location{" "}
                      {isPreferredLocationRequired && <span className="text-red-600">*</span>}
                    </Label>
                    <Input
                      className="mt-2"
                      placeholder={form.mode === "Online" ? "Optional for online interns" : "City / Region preference"}
                      value={form.preferredLocation}
                      onChange={(e) => handleChange("preferredLocation", e.target.value)}
                      required={isPreferredLocationRequired}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-800">
                      Internship type <span className="text-red-600">*</span>
                    </Label>
                    <RadioGroup
                      value={form.internshipType}
                      onValueChange={(value: "Free" | "Stipend") => handleChange("internshipType", value)}
                      className="mt-3 space-y-2"
                    >
                      {INTERNSHIP_CATEGORY.map((item) => (
                        <Label key={item.value} htmlFor={`cat-${item.value}`} className="flex items-center gap-3">
                          <RadioGroupItem value={item.value} id={`cat-${item.value}`} />
                          <span>{item.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-slate-800">Additional notes (optional)</Label>
                    <Textarea
                      value={form.additionalNotes}
                      onChange={(e) => handleChange("additionalNotes", e.target.value)}
                      placeholder="Anything you want to share (skills, expectations, availability, etc.)"
                      rows={4}
                      className="mt-2 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Resume upload */}
              <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#673ab7] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">
                  Resume (PDF) <span className="text-red-600">*</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">PDF only • max 7MB</p>

                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                    <div className="text-sm text-slate-700">
                      {form.resumeFile ? (
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {form.resumeFile.name}
                        </span>
                      ) : (
                        "No file chosen"
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById(`resume-upload-${resumeInputId}`)?.click()}
                    >
                      <UploadCloud className="w-4 h-4 mr-2" />
                      Add file
                    </Button>
                  </div>

                  <Input
                    id={`resume-upload-${resumeInputId}`}
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={(event) => handleResumeChange(event.target.files?.[0] || null)}
                  />

                  {form.resumeFile && (
                    <button
                      type="button"
                      className="text-xs text-red-600 underline underline-offset-2 self-start"
                      onClick={() => handleResumeChange(null)}
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <Button type="submit" className="bg-[#673ab7] hover:bg-[#5e35b1]" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-700"
                  onClick={() => {
                    setForm((prev) => ({
                      ...defaultState,
                      name: variant === "dashboard" && currentUser?.name ? currentUser.name : "",
                      email: variant === "dashboard" && currentUser?.email ? currentUser.email : "",
                      phone: variant === "dashboard" && currentUser?.phone ? currentUser.phone : "",
                      collegeName: variant === "dashboard" && currentUser?.college ? currentUser.college : "",
                      branch: variant === "dashboard" && currentUser?.branch ? currentUser.branch : "",
                      semester: variant === "dashboard" && currentUser?.semester ? String(currentUser.semester) : "",
                    }));
                  }}
                >
                  Clear form
                </Button>
              </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InternshipForm;

