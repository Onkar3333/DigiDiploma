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
      <div className="relative rounded-[28px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 p-[1px] shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
        <Card className="relative rounded-[26px] border border-white/50 bg-white/95 shadow-[0_20px_70px_rgba(15,23,42,0.15)]">
          <CardHeader className="space-y-4 border-b border-slate-100/80 pb-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-blue-500">Step into industry</p>
                <CardTitle className="text-3xl font-bold text-slate-900">Internship Application</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary" className="bg-blue-50 text-blue-600">
                  {variant === "dashboard" ? "Student account linked" : "No login required"}
                </Badge>
                <Badge variant="outline" className="text-slate-500">
                  PDF Resume • 7MB
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <section className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-500">Personal Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Full name" required />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="student@email.com" required />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+91 9876543210" required />
                  </div>
                  <div>
                    <Label>College Name</Label>
                    <Input value={form.collegeName} onChange={(e) => handleChange("collegeName", e.target.value)} placeholder="Enter college name" required />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-500">Academic Snapshot</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label>Branch</Label>
                <div className="rounded-2xl text-black border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50">
                  <Select value={form.branch} onValueChange={(value) => handleChange("branch", value)}>
                    <SelectTrigger className="bg-transparent text-black border-0 focus:ring-0">
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
                    <Label>Semester</Label>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50">
                  <Select value={form.semester} onValueChange={(value) => handleChange("semester", value)}>
                    <SelectTrigger className="bg-transparent text-black border-0 focus:ring-0">
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
                  <div>
                <Label>Duration (weeks)</Label>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50">
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={form.duration}
                    onChange={(e) => handleChange("duration", e.target.value)}
                    placeholder="e.g. 12"
                    className="border-0 bg-transparent focus-visible:ring-0"
                  />
                </div>
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-500">Preferences</p>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Track</Label>
                    <RadioGroup
                      value={form.type}
                      onValueChange={(value: "Hardware" | "Software") => handleChange("type", value)}
                      className="mt-3 space-y-3"
                    >
                      {INTERNSHIP_TYPES.map((item) => (
                        <Label
                          key={item.value}
                          htmlFor={`type-${item.value}`}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                            form.type === item.value ? "border-blue-500 bg-blue-50 text-blue-700 shadow" : "border-slate-200 bg-white"
                          }`}
                        >
                          <RadioGroupItem value={item.value} id={`type-${item.value}`} />
                          <span className="font-medium">{item.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Mode</Label>
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-500/40">
                      <Select value={form.mode} onValueChange={(value: "Hybrid" | "Onsite" | "Online") => handleChange("mode", value)}>
                        <SelectTrigger className="bg-transparent border-0 focus:ring-0 text-slate-800">
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
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Internship Type</Label>
                    <RadioGroup
                      value={form.internshipType}
                      onValueChange={(value: "Free" | "Stipend") => handleChange("internshipType", value)}
                      className="mt-3 flex gap-3 flex-wrap"
                    >
                      {INTERNSHIP_CATEGORY.map((item) => (
                        <Label
                          key={item.value}
                          htmlFor={`cat-${item.value}`}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 cursor-pointer transition-all ${
                            form.internshipType === item.value ? "border-blue-500 bg-blue-50 text-blue-700 shadow" : "border-slate-200 bg-white"
                          }`}
                        >
                          <RadioGroupItem value={item.value} id={`cat-${item.value}`} />
                          <span className="font-medium">{item.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-500">Location & Notes</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Preferred Location {isPreferredLocationRequired && <span className="text-destructive">*</span>}</Label>
                    <Input
                      placeholder={form.mode === "Online" ? "Optional for online interns" : "City / Region preference"}
                      value={form.preferredLocation}
                      onChange={(e) => handleChange("preferredLocation", e.target.value)}
                      required={isPreferredLocationRequired}
                    />
                  </div>
                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={form.additionalNotes}
                      onChange={(e) => handleChange("additionalNotes", e.target.value)}
                      placeholder="Share expectations, technologies you know, or anything else you'd like us to know."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-500">Resume Upload</p>
                <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Upload your latest resume</p>
                      <p className="text-xs text-slate-500">PDF only • Max 7MB • clear formatting</p>
                    </div>
                    <Button type="button" variant="outline" className="relative" onClick={() => document.getElementById(`resume-upload-${resumeInputId}`)?.click()}>
                      <UploadCloud className="w-4 h-4 mr-2" />
                      Upload PDF
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
                    <p className="text-sm flex items-center gap-2 text-primary">
                      <FileText className="w-4 h-4" />
                      {form.resumeFile.name}
                      <button type="button" className="text-xs text-destructive underline ml-2" onClick={() => handleResumeChange(null)}>
                        remove
                      </button>
                    </p>
                  )}
                </div>
              </section>

              <div className="flex justify-end">
                <Button type="submit" className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InternshipForm;

