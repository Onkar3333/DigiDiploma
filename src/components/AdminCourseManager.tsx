import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/auth";
import { ALL_BRANCHES } from "@/constants/branches";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Layers, PlusCircle, RefreshCcw, Image as ImageIcon, ExternalLink, Pencil, Trash2 } from "lucide-react";

type CourseRecord = {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  branch: string;
  semester: number | string;
  subject: string;
  poster?: string;
  coverPhoto?: string | null;
  resourceUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type CourseFormData = {
  title: string;
  description: string;
  branch: string;
  semester: string;
  subject: string;
  coverPhoto: string;
  resourceUrl: string;
  coverPhotoFile: File | null;
};

const DEFAULT_BRANCHES = [...ALL_BRANCHES];

const DEFAULT_SEMESTERS = [1, 2, 3, 4, 5, 6];
const SUBJECT_ALL_VALUE = "__all_subjects";

const AdminCourseManager: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [branches, setBranches] = useState<string[]>(DEFAULT_BRANCHES);
  const [semesters, setSemesters] = useState<number[]>(DEFAULT_SEMESTERS);
  const [subjects, setSubjects] = useState<{ name: string; code: string }[]>([]);
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [filterSemester, setFilterSemester] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>(SUBJECT_ALL_VALUE);
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    branch: "",
    semester: "",
    subject: "",
    coverPhoto: "",
    resourceUrl: "",
    coverPhotoFile: null,
  });
  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>("");

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCoverPhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG/PNG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover photo must be under 5MB.");
      return;
    }
    setFormData((prev) => ({ ...prev, coverPhotoFile: file, coverPhoto: "" }));
  };

  const clearCoverPhotoFile = () => {
    setFormData((prev) => ({ ...prev, coverPhotoFile: null }));
  };

  useEffect(() => {
    if (formData.coverPhotoFile) {
      const objectUrl = URL.createObjectURL(formData.coverPhotoFile);
      setCoverPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setCoverPreviewUrl("");
  }, [formData.coverPhotoFile]);

  const authenticatedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
        ...authService.getAuthHeaders(),
      };
      let response = await fetch(input, { ...init, headers });
      if (response.status === 401) {
        try {
          await authService.refreshToken();
          response = await fetch(input, { ...init, headers: { ...headers, ...authService.getAuthHeaders() } });
        } catch (err) {
          console.error("Failed to refresh token", err);
        }
      }
      return response;
    },
    []
  );

  const normalizeCourse = (course: any): CourseRecord => {
    const id = course?._id || course?.id;
    return {
      _id: id,
      id,
      title: course?.title || "Untitled",
      description: course?.description || "",
      branch: course?.branch || "Unknown",
      semester: course?.semester ?? "-",
      subject: course?.subject || "-",
      poster: course?.poster || null,
      coverPhoto: course?.coverPhoto || course?.poster || "",
      resourceUrl: course?.resourceUrl || "",
      createdAt: course?.createdAt || new Date().toISOString(),
      updatedAt: course?.updatedAt || course?.createdAt || new Date().toISOString(),
    };
  };

  const fetchBranches = useCallback(async () => {
    try {
      const res = await authenticatedFetch("/api/subjects/branches");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBranches(data);
          if (!filterBranch) {
            setFilterBranch(data[0]);
            setFormData((prev) => ({ ...prev, branch: data[0] }));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  }, [authenticatedFetch, filterBranch]);

  const fetchSemesters = useCallback(
    async (branch: string, updateFormData = false) => {
      if (!branch) {
        setSemesters(DEFAULT_SEMESTERS);
        return;
      }
      try {
        const res = await authenticatedFetch(`/api/subjects/branches/${encodeURIComponent(branch)}/semesters`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSemesters(data);
            // Only update filter/form data if explicitly requested
            if (updateFormData) {
              setFilterSemester(String(data[0]));
              setFormData((prev) => ({ ...prev, semester: String(data[0]) }));
            }
          } else {
            setSemesters(DEFAULT_SEMESTERS);
          }
        }
      } catch (error) {
        console.error("Error fetching semesters:", error);
        setSemesters(DEFAULT_SEMESTERS);
      }
    },
    [authenticatedFetch]
  );

  const fetchSubjects = useCallback(
    async (branch: string, semester: string) => {
      if (!branch || !semester) {
        setSubjects([]);
        return;
      }
      try {
        console.log('🔍 Fetching subjects:', { branch, semester });
        const res = await authenticatedFetch(`/api/subjects?branch=${encodeURIComponent(branch)}&semester=${encodeURIComponent(semester)}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          console.log('✅ Subjects fetched:', list.length, 'subjects for', branch, 'semester', semester);
          if (list.length > 0) {
            console.log('📋 Sample subjects:', list.slice(0, 3).map(s => ({ name: s.name, code: s.code })));
          }
          setSubjects(list);
          const subjectNames = list.map((item) => item.name);
          const firstSubject = subjectNames[0] || "";
          
          // Only update filter data if not in form mode (check isFormOpen from state, not closure)
          // We'll check this conditionally based on context
          if (!firstSubject) {
            // Only update filter if we're not in form mode
            // This will be handled by the calling context
          }
          
          // Auto-select first subject in form if available and not editing
          // This will be handled by the useEffect that calls fetchSubjects
        } else {
          console.error('❌ Failed to fetch subjects:', res.status, res.statusText);
          const errorData = await res.json().catch(() => ({}));
          console.error('Error details:', errorData);
          setSubjects([]);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        setSubjects([]);
      }
    },
    [authenticatedFetch, formData.subject, editingCourse, filterSubject, isFormOpen]
  );

  const fetchCourses = useCallback(async () => {
    if (!filterBranch) {
      setCourses([]);
      setLoadingCourses(false);
      return;
    }
    setLoadingCourses(true);
    try {
      const params = new URLSearchParams();
      if (filterBranch) params.append("branch", filterBranch);
      if (filterSemester) params.append("semester", filterSemester);
      if (filterSubject && filterSubject !== SUBJECT_ALL_VALUE) params.append("subject", filterSubject);
      const res = await authenticatedFetch(`/api/courses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.courses || [];
      const normalized = list
        .map(normalizeCourse)
        .filter((course) => filterSubject === SUBJECT_ALL_VALUE || course.subject === filterSubject);
      setCourses(normalized);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to fetch courses");
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  }, [authenticatedFetch, filterBranch, filterSemester, filterSubject]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (filterBranch && !isFormOpen) {
      // Only update filter semesters when form is not open
      fetchSemesters(filterBranch, true);
      // Reset semester and subject when branch changes
      setFilterSemester("");
      setFilterSubject(SUBJECT_ALL_VALUE);
      setSubjects([]);
    } else if (!filterBranch && !isFormOpen) {
      setSemesters([]);
      setSubjects([]);
    }
  }, [filterBranch, fetchSemesters, isFormOpen]);

  useEffect(() => {
    if (filterBranch && filterSemester && !isFormOpen) {
      // Only update filter subjects when form is not open
      fetchSubjects(filterBranch, filterSemester);
      // Reset subject when semester changes
      setFilterSubject(SUBJECT_ALL_VALUE);
    } else if ((!filterBranch || !filterSemester) && !isFormOpen) {
      setSubjects([]);
    }
  }, [filterBranch, filterSemester, fetchSubjects, isFormOpen]);

  // Fetch semesters when formData.branch changes (for form dropdowns)
  useEffect(() => {
    if (isFormOpen && formData.branch) {
      console.log('📚 Form useEffect: Fetching semesters for branch:', formData.branch);
      fetchSemesters(formData.branch, false);
    }
  }, [formData.branch, isFormOpen, fetchSemesters]);

  // Fetch subjects when formData.branch and formData.semester change (for form dropdowns)
  useEffect(() => {
    if (isFormOpen && formData.branch && formData.semester) {
      console.log('📚 Form useEffect: Fetching subjects for branch:', formData.branch, 'semester:', formData.semester);
      fetchSubjects(formData.branch, formData.semester);
    } else if (isFormOpen && (!formData.branch || !formData.semester)) {
      setSubjects([]);
    }
  }, [formData.branch, formData.semester, isFormOpen, fetchSubjects]);

  useEffect(() => {
    if (filterBranch && filterSemester) {
      fetchCourses();
    }
  }, [filterBranch, filterSemester, filterSubject, fetchCourses]);

  useWebSocket({
    userId: user?.id || "",
    token: authService.getToken() || undefined,
    onMessage: (message) => {
      if (message.course) {
        const normalized = normalizeCourse(message.course);
        const matchesBranch = !filterBranch || normalized.branch === filterBranch;
        const matchesSemester = !filterSemester || String(normalized.semester) === String(filterSemester);
        const matchesSubject = filterSubject === SUBJECT_ALL_VALUE || normalized.subject === filterSubject;
        if (message.type === "course_launched" && matchesBranch && matchesSemester && matchesSubject) {
          setCourses((prev) => {
            const exists = prev.some((c) => c.id === normalized.id);
            if (exists) {
              return prev.map((course) => (course.id === normalized.id ? { ...course, ...normalized } : course));
            }
            return [normalized, ...prev];
          });
        }
        if (message.type === "course_updated") {
          setCourses((prev) => {
            if (!matchesBranch || !matchesSemester || !matchesSubject) {
              return prev.filter((course) => course.id !== normalized.id);
            }
            return prev.map((course) =>
              course.id === normalized.id ? { ...course, ...normalized } : course
            );
          });
        }
      } else if (message.type === "course_deleted" && message.courseId) {
        setCourses((prev) => prev.filter((course) => course.id !== message.courseId));
      }
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      branch: filterBranch || "",
      semester: filterSemester || "",
      subject: filterSubject !== SUBJECT_ALL_VALUE ? filterSubject : "",
      coverPhoto: "",
      resourceUrl: "",
      coverPhotoFile: null,
    });
    setEditingCourse(null);
    setIsFormOpen(false);
  };

  const handleEditCourse = (course: CourseRecord) => {
    setEditingCourse(course);
    setIsFormOpen(true);
    const branch = course.branch || "";
    const semester = String(course.semester ?? "");
    setFormData({
      title: course.title || "",
      description: course.description || "",
      branch: branch,
      semester: semester,
      subject: course.subject || "",
      coverPhoto: course.coverPhoto || "",
      resourceUrl: course.resourceUrl || "",
      coverPhotoFile: null,
    });
    // Fetch semesters and subjects for the course's branch and semester
    if (branch) {
      fetchSemesters(branch, false);
      if (semester) {
        // Use setTimeout to ensure formData is updated first
        setTimeout(() => {
          fetchSubjects(branch, semester);
        }, 100);
      }
    }
  };

  const handleDeleteCourse = async (course: CourseRecord) => {
    if (!course.id) return;
    const confirmed = window.confirm(`Delete course "${course.title}"? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      const res = await authenticatedFetch(`/api/courses/${course.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete course");
      }
      toast.success("Course deleted");
      setCourses((prev) => prev.filter((item) => item.id !== course.id));
      if (editingCourse?.id === course.id) {
        resetForm();
      }
    } catch (error: any) {
      console.error("Error deleting course:", error);
      toast.error(error.message || "Failed to delete course");
    }
  };

  const handleSubmitCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.branch || !formData.semester || !formData.subject) {
      toast.error("All fields are required");
      return;
    }
    try {
      setIsSubmitting(true);
      let coverPhotoUrl = formData.coverPhoto.trim();
      if (formData.coverPhotoFile) {
        try {
          const base64 = await convertFileToBase64(formData.coverPhotoFile);
          const uploadRes = await authenticatedFetch("/api/materials/upload-base64", {
        method: "POST",
        body: JSON.stringify({
              filename: formData.coverPhotoFile.name,
              contentType: formData.coverPhotoFile.type,
              dataBase64: base64,
            }),
          });
          if (!uploadRes.ok) {
            const err = await uploadRes.json().catch(() => ({}));
            throw new Error(err?.error || "Failed to upload cover photo");
          }
          const uploadData = await uploadRes.json();
          coverPhotoUrl = uploadData.url || coverPhotoUrl;
        } catch (uploadError: any) {
          throw new Error(uploadError?.message || "Cover photo upload failed");
        }
      }
      const payload = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          branch: formData.branch,
          semester: Number(formData.semester),
          subject: formData.subject,
        coverPhoto: coverPhotoUrl || null,
        resourceUrl: formData.resourceUrl.trim(),
      };
      const endpoint = editingCourse?.id ? `/api/courses/${editingCourse.id}` : "/api/courses";
      const method = editingCourse?.id ? "PUT" : "POST";
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to ${editingCourse ? "update" : "create"} course`);
      }
      toast.success(editingCourse ? "Course updated successfully" : "Course launched successfully");
      resetForm();
      fetchCourses();
    } catch (error: any) {
      console.error("Error submitting course:", error);
      toast.error(error.message || `Failed to ${editingCourse ? "update" : "create"} course`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = user?.userType === 'admin';

  return (
    <div className="space-y-8">
      {/* Launch New Course Button at Top - Only for Admin */}
      {isAdmin && (
        <Card className="border border-slate-200 shadow-md">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-primary" />
                {editingCourse ? "Update Course" : "Launch New Course"}
              </CardTitle>
              {editingCourse && (
                <p className="text-xs text-muted-foreground">
                  Editing <strong>{editingCourse.title}</strong>. Make changes below or{" "}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-primary underline underline-offset-2"
                  >
                    cancel editing
                  </button>
                  .
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isFormOpen && !editingCourse && (
                <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(false)}>
                  Hide Form
                </Button>
              )}
              {!isFormOpen && (
                <Button size="sm" onClick={() => setIsFormOpen(true)}>
                  Launch New Course
                </Button>
              )}
            </div>
          </CardHeader>
          {isFormOpen && (
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmitCourse}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Branch *</Label>
                    <Select 
                      value={formData.branch} 
                      onValueChange={(value) => {
                        setFormData((prev) => ({ 
                          ...prev, 
                          branch: value,
                          semester: "", // Reset semester when branch changes
                          subject: "" // Reset subject when branch changes
                        }));
                        // Fetch semesters for the new branch (don't auto-update formData)
                        console.log('📚 Form: Branch changed to:', value);
                        fetchSemesters(value, false);
                        // Clear subjects
                        setSubjects([]);
                      }}
                    >
                      <SelectTrigger className="mt-2 text-slate-900">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent className="text-slate-900">
                        {branches.length > 0 ? (
                          branches.map((branch) => (
                            <SelectItem key={branch} value={branch}>
                              {branch}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-slate-500">No branches available</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Semester *</Label>
                    <Select 
                      value={formData.semester} 
                      onValueChange={(value) => {
                        const currentBranch = formData.branch;
                        setFormData((prev) => ({ 
                          ...prev, 
                          semester: value,
                          subject: "" // Reset subject when semester changes
                        }));
                        // Fetch subjects for the current branch and new semester
                        if (currentBranch) {
                          console.log('📚 Form: Fetching subjects for branch:', currentBranch, 'semester:', value);
                          fetchSubjects(currentBranch, value);
                        }
                      }}
                      disabled={!formData.branch}
                    >
                      <SelectTrigger className="mt-2 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed">
                        <SelectValue placeholder={formData.branch ? "Select semester" : "Select branch first"} />
                      </SelectTrigger>
                      <SelectContent className="text-slate-900">
                        {semesters.length > 0 ? (
                          semesters.map((sem) => (
                            <SelectItem key={sem} value={String(sem)}>
                              Semester {sem}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-slate-500">
                            {formData.branch ? "No semesters available" : "Select branch first"}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Subject *</Label>
                    <Select 
                      value={formData.subject} 
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, subject: value }))}
                      disabled={!formData.branch || !formData.semester}
                    >
                      <SelectTrigger className="mt-2 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed">
                        <SelectValue placeholder={formData.branch && formData.semester ? "Select subject" : "Select branch and semester first"} />
                      </SelectTrigger>
                      <SelectContent className="text-slate-900">
                        {subjects.length > 0 ? (
                          subjects.map((subject) => (
                            <SelectItem key={subject.code} value={subject.name}>
                              {subject.name} ({subject.code})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-slate-500">
                            {formData.branch && formData.semester ? "No subjects available" : "Select branch and semester first"}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Course Title</Label>
                    <Input
                      className="mt-2"
                      placeholder="Enter course title"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <Input
                      className="mt-2"
                      placeholder="Brief description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Course Cover Image
                    </Label>
                    <Input
                      className="mt-2"
                      placeholder="https://..."
                      value={formData.coverPhoto}
                      onChange={(e) => setFormData((prev) => ({ ...prev, coverPhoto: e.target.value, coverPhotoFile: null }))}
                      disabled={!!formData.coverPhotoFile}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Paste an image URL (JPG/PNG) or upload below. Uploaded images override the URL.
                    </p>
                    <div className="mt-3 space-y-2">
                      <Input type="file" accept="image/*" onChange={handleCoverPhotoFileChange} />
                      {formData.coverPhotoFile && (
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{formData.coverPhotoFile.name}</span>
                          <button type="button" className="text-red-500 hover:underline" onClick={clearCoverPhotoFile}>
                            Remove upload
                          </button>
                        </div>
                      )}
                    </div>
                    {(formData.coverPhotoFile || formData.coverPhoto) && (
                      <div className="mt-3 h-32 rounded-xl border overflow-hidden">
                        <img
                          src={formData.coverPhotoFile ? coverPreviewUrl : formData.coverPhoto}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          onError={() => toast.error("Unable to load cover photo preview")}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      External Resource Link
                    </Label>
                    <Input
                      className="mt-2"
                      placeholder="https://learning-platform.com/my-course"
                      value={formData.resourceUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, resourceUrl: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The popup CTA will open this link in a new tab.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : editingCourse ? "Update Course" : "Launch Course"}
                  </Button>
                  {editingCourse && (
                    <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      <Card className="border border-slate-200 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Course Library
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-blue-500 font-medium">Branch *</Label>
              <Select 
                value={filterBranch} 
                onValueChange={(value) => {
                  setFilterBranch(value);
                  // Reset semester and subject when branch changes
                  setFilterSemester("");
                  setFilterSubject(SUBJECT_ALL_VALUE);
                  setSemesters([]);
                  setSubjects([]);
                }}
              >
                <SelectTrigger className="mt-2 text-slate-900">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="text-slate-900">
                  {branches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-blue-500 font-medium">Semester *</Label>
              <Select 
                value={filterSemester} 
                onValueChange={(value) => {
                  setFilterSemester(value);
                  // Reset subject when semester changes
                  setFilterSubject(SUBJECT_ALL_VALUE);
                  setSubjects([]);
                }}
                disabled={!filterBranch}
              >
                <SelectTrigger className="mt-2 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed">
                  <SelectValue placeholder={filterBranch ? "Select semester" : "Select branch first"} />
                </SelectTrigger>
                <SelectContent className="text-slate-900">
                  {semesters.length > 0 ? (
                    semesters.map((sem) => (
                      <SelectItem key={sem} value={String(sem)}>
                        Semester {sem}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-slate-500">No semesters available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-blue-500 font-medium">Subject</Label>
              <Select 
                value={filterSubject} 
                onValueChange={setFilterSubject}
                disabled={!filterBranch || !filterSemester}
              >
                <SelectTrigger className="mt-2 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed">
                  <SelectValue placeholder={filterBranch && filterSemester ? "All subjects" : "Select branch and semester first"} />
                </SelectTrigger>
                <SelectContent className="text-slate-900">
                  <SelectItem value={SUBJECT_ALL_VALUE}>All subjects</SelectItem>
                  {subjects.length > 0 ? (
                    subjects.map((subject) => (
                      <SelectItem key={subject.code} value={subject.name}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-slate-500">No subjects available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing courses for <strong>{filterBranch || "select a branch"}</strong>
              {filterSemester && ` • Semester ${filterSemester}`}
              {filterSubject && ` • ${filterSubject}`}
            </p>
            <Button variant="outline" size="sm" onClick={fetchCourses} disabled={loadingCourses}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          <ScrollArea className="h-[360px] border border-dashed rounded-xl p-4">
            {loadingCourses ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No courses found for this selection.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <div key={course.id} className="p-4 border rounded-2xl bg-white shadow-sm space-y-3">
                    <div className="relative h-36 rounded-xl overflow-hidden">
                      {course.coverPhoto ? (
                        <img src={course.coverPhoto} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold">
                          {course.title.slice(0, 1)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                      <div className="absolute top-3 left-3">
                        <Badge variant="secondary">Sem {course.semester}</Badge>
                      </div>
                      {course.resourceUrl && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-3 right-3 bg-white/80 text-slate-900 hover:bg-white"
                          onClick={() => window.open(course.resourceUrl, "_blank", "noopener")}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                      <h4 className="text-lg font-semibold">{course.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {course.subject}
                      </span>
                      <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {course.branch}
                      </span>
                      {course.updatedAt && (
                        <span className="ml-auto text-[10px]">
                          Updated {new Date(course.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCourse(course)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteCourse(course)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

    </div>
  );
};

export default AdminCourseManager;

