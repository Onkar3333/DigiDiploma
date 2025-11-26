import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchInternshipApplications, deleteInternshipApplication } from "@/lib/internship";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Download, RefreshCcw, Trash2, FileText, Search } from "lucide-react";

interface InternshipApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  collegeName: string;
  branch: string;
  semester: string;
  type: string;
  mode: string;
  duration: string;
  preferredLocation?: string;
  resumeUrl: string;
  internshipType: string;
  additionalNotes?: string;
  createdAt: string;
}

const formatDate = (value?: string) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

const downloadBlob = (content: string | Blob, filename: string, type: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const headers = ["Name", "Email", "Phone", "College", "Branch", "Semester", "Track", "Mode", "Duration", "Preferred Location", "Internship Type", "Submitted On"];

const AdminInternshipApplications = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredApplications = useMemo(() => {
    if (!search) return applications;
    const term = search.toLowerCase();
    return applications.filter((app) =>
      [
        app.name,
        app.email,
        app.phone,
        app.branch,
        app.collegeName,
        app.mode,
        app.type,
        app.internshipType,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [applications, search]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await fetchInternshipApplications();
      setApplications(res.applications || []);
    } catch (error: any) {
      toast({
        title: "Failed to fetch applications",
        description: error?.message || "Unable to load internship applications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this internship application? This action cannot be undone.")) return;
    try {
      setDeletingId(id);
      await deleteInternshipApplication(id);
      toast({ title: "Application deleted" });
      setApplications((prev) => prev.filter((app) => app.id !== id));
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error?.message || "Unable to delete application.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const exportCSV = () => {
    const csvRows = [headers.join(",")];
    filteredApplications.forEach((app) => {
      csvRows.push(
        [
          app.name,
          app.email,
          app.phone,
          app.collegeName,
          app.branch,
          app.semester,
          app.type,
          app.mode,
          app.duration,
          app.preferredLocation || "",
          app.internshipType,
          formatDate(app.createdAt),
        ]
          .map((value) => `"${(value || "").replace(/"/g, '""')}"`)
          .join(",")
      );
    });
    downloadBlob(csvRows.join("\n"), "internship_applications.csv", "text/csv;charset=utf-8;");
  };

  const exportExcel = () => {
    const data = filteredApplications.map((app) => ({
      Name: app.name,
      Email: app.email,
      Phone: app.phone,
      College: app.collegeName,
      Branch: app.branch,
      Semester: app.semester,
      Track: app.type,
      Mode: app.mode,
      Duration: app.duration,
      "Preferred Location": app.preferredLocation || "",
      "Internship Type": app.internshipType,
      "Submitted On": formatDate(app.createdAt),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Applications");
    XLSX.writeFile(workbook, "internship_applications.xlsx");
  };

  const exportWord = () => {
    const html = [
      "<html><body><table border='1' style='border-collapse:collapse;width:100%'><thead><tr>",
      headers.map((header) => `<th>${header}</th>`).join(""),
      "</tr></thead><tbody>",
      ...filteredApplications.map((app) => {
        const row = [
          app.name,
          app.email,
          app.phone,
          app.collegeName,
          app.branch,
          app.semester,
          app.type,
          app.mode,
          app.duration,
          app.preferredLocation || "",
          app.internshipType,
          formatDate(app.createdAt),
        ];
        return `<tr>${row.map((value) => `<td>${value || ""}</td>`).join("")}</tr>`;
      }),
      "</tbody></table></body></html>",
    ].join("");
    downloadBlob(html, "internship_applications.doc", "application/msword");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const columnWidths = [40, 40, 25, 40, 30, 15, 25, 25, 20, 30, 20, 25];
    doc.setFontSize(12);
    doc.text("Internship Applications", 14, 15);

    const rowsPerPage = 15;
    filteredApplications.forEach((app, index) => {
      if (index % rowsPerPage === 0) {
        doc.setFontSize(10);
        headers.forEach((header, colIndex) => {
          doc.text(header, 14 + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), 25);
        });
      }
      const rowIndexOnPage = index % rowsPerPage;
      const y = 35 + rowIndexOnPage * 8;
      if (rowIndexOnPage === 0 && index !== 0) {
        doc.addPage();
      }
      const row = [
        app.name,
        app.email,
        app.phone,
        app.collegeName,
        app.branch,
        app.semester,
        app.type,
        app.mode,
        app.duration,
        app.preferredLocation || "",
        app.internshipType,
        formatDate(app.createdAt),
      ];
      row.forEach((value, colIndex) => {
        const x = 14 + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0);
        doc.text(String(value || ""), x, y, { maxWidth: columnWidths[colIndex] - 2 });
      });
    });
    doc.save("internship_applications.pdf");
  };

  return (
    <Card className="border border-slate-200 shadow-lg">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2">Internship</Badge>
          <CardTitle className="text-2xl">Applications</CardTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportWord}>
            <Download className="w-4 h-4 mr-2" />
            Word
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={loadApplications} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search name, email, branch, mode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">{filteredApplications.length} results</div>
        </div>

        <ScrollArea className="max-h-[520px] border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Student</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Academics</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Internship</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Resume</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading applications...
                  </td>
                </tr>
              )}
              {!loading && filteredApplications.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No applications found.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{app.name}</div>
                      <div className="text-xs text-muted-foreground">{app.email}</div>
                      <div className="text-xs text-muted-foreground">{app.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{app.collegeName}</div>
                      <div className="text-xs text-muted-foreground">
                        {app.branch} • Sem {app.semester}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(app.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-sm space-y-1">
                      <Badge variant="outline">{app.type}</Badge>
                      <Badge variant="outline">{app.mode}</Badge>
                      <div className="text-xs text-muted-foreground">{app.duration}</div>
                      {app.preferredLocation && (
                        <div className="text-xs text-muted-foreground">Prefers: {app.preferredLocation}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(app.resumeUrl, "_blank", "noopener")}
                        disabled={!app.resumeUrl}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(app.id)}
                        disabled={deletingId === app.id}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AdminInternshipApplications;

