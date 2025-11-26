import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Upload, 
  Save,
  X,
  CheckCircle,
  GraduationCap,
  Award,
  AlertCircle
} from 'lucide-react';
import { ALL_BRANCHES } from '@/constants/branches';
// Branch constants for the application
const AVAILABLE_BRANCHES = [...ALL_BRANCHES];

interface Subject {
  _id?: string;
  name: string;
  code: string;
  branch: string;
  semester: number;
  credits: number;
  hours: number;
  type: 'Theory' | 'Practical' | 'Project' | 'Elective';
  description?: string;
  isActive: boolean;
}

const AdminSubjectManager: React.FC = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>('Computer Engineering');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<{ imported: number; errors: number; errorDetails: any[] } | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [newSubject, setNewSubject] = useState<Partial<Subject>>({
    name: '',
    code: '',
    branch: 'Computer Engineering',
    semester: 1,
    credits: 4,
    hours: 60,
    type: 'Theory',
    description: ''
  });

  const availableBranches = AVAILABLE_BRANCHES;
  const semesters = [1, 2, 3, 4, 5, 6];

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const query = selectedBranch ? `?branch=${encodeURIComponent(selectedBranch)}` : '';
      const response = await fetch(`/api/subjects${query}`, { headers: { ...authService.getAuthHeaders() } });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [selectedBranch]);

  const filteredSubjects = subjects.filter(subject => 
    subject.branch === selectedBranch &&
    (subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     subject.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
        body: JSON.stringify(newSubject)
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewSubject({
          name: '',
          code: '',
          branch: 'Computer Engineering',
          semester: 1,
          credits: 4,
          hours: 60,
          type: 'Theory',
          description: ''
        });
        fetchSubjects();
      }
    } catch (error) {
      console.error('Error adding subject:', error);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const response = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
        headers: { ...authService.getAuthHeaders() }
      });

      if (response.ok) {
        fetchSubjects();
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  };

  const handleDeleteAllSubjects = async () => {
    const totalCount = subjects.length;
    if (totalCount === 0) {
      toast({
        title: "No subjects to delete",
        description: "There are no subjects in the system.",
        variant: "destructive",
      });
      return;
    }

    // Password protection - First step
    const password = prompt(
      `🔒 SECURITY CHECK\n\nTo delete all ${totalCount} subjects, please enter the security password:`
    );

    if (!password) {
      toast({
        title: "Deletion cancelled",
        description: "Password entry cancelled.",
      });
      return;
    }

    if (password !== '8956446484') {
      toast({
        title: "Access Denied",
        description: "Incorrect password. Deletion cancelled.",
        variant: "destructive",
      });
      return;
    }

    // Double confirmation for safety
    const firstConfirm = confirm(
      `⚠️ WARNING: This will delete ALL ${totalCount} subjects from the database.\n\nThis action cannot be undone!\n\nAre you sure you want to continue?`
    );
    
    if (!firstConfirm) return;

    const secondConfirm = confirm(
      `⚠️ FINAL CONFIRMATION\n\nYou are about to permanently delete ALL ${totalCount} subjects.\n\nType "DELETE ALL" in the next prompt to confirm.`
    );
    
    if (!secondConfirm) return;

    const typedConfirm = prompt(
      `Type "DELETE ALL" (in uppercase) to confirm deletion of all ${totalCount} subjects:`
    );

    if (typedConfirm !== 'DELETE ALL') {
      toast({
        title: "Deletion cancelled",
        description: "Confirmation text did not match. Deletion cancelled.",
      });
      return;
    }

    try {
      const response = await fetch('/api/subjects/all', {
        method: 'DELETE',
        headers: { ...authService.getAuthHeaders() }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "All subjects deleted",
          description: `Successfully deleted ${data.deletedCount || totalCount} subject(s).`,
        });
        // Clear local state
        setSubjects([]);
        // Refresh to ensure UI is updated
        await fetchSubjects();
      } else {
        let errorMessage = "Failed to delete all subjects";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error('Delete all subjects error:', errorMessage);
        toast({
          title: "Deletion failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error deleting all subjects:', error);
      const errorMessage = error?.message || "An error occurred while deleting all subjects. Please check the console for details.";
      toast({
        title: "Deletion failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllSubjectsByBranch = async () => {
    const branchCount = filteredSubjects.length;
    if (branchCount === 0) {
      toast({
        title: "No subjects to delete",
        description: `There are no subjects for branch "${selectedBranch}".`,
        variant: "destructive",
      });
      return;
    }

    // Password protection - First step
    const password = prompt(
      `🔒 SECURITY CHECK\n\nTo delete all ${branchCount} subjects for branch "${selectedBranch}", please enter the security password:`
    );

    if (!password) {
      toast({
        title: "Deletion cancelled",
        description: "Password entry cancelled.",
      });
      return;
    }

    if (password !== '8956446484') {
      toast({
        title: "Access Denied",
        description: "Incorrect password. Deletion cancelled.",
        variant: "destructive",
      });
      return;
    }

    // Confirmation
    const confirmDelete = confirm(
      `⚠️ WARNING: This will delete ALL ${branchCount} subjects for branch "${selectedBranch}" from the database.\n\nThis action cannot be undone!\n\nAre you sure you want to continue?`
    );
    
    if (!confirmDelete) return;

    const typedConfirm = prompt(
      `Type "DELETE" (in uppercase) to confirm deletion of all ${branchCount} subjects for branch "${selectedBranch}":`
    );

    if (typedConfirm !== 'DELETE') {
      toast({
        title: "Deletion cancelled",
        description: "Confirmation text did not match. Deletion cancelled.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/subjects/branch/${encodeURIComponent(selectedBranch)}`, {
        method: 'DELETE',
        headers: { ...authService.getAuthHeaders() }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Branch subjects deleted",
          description: `Successfully deleted ${data.deletedCount || branchCount} subject(s) for branch "${selectedBranch}".`,
        });
        // Refresh to ensure UI is updated
        await fetchSubjects();
      } else {
        let errorMessage = "Failed to delete subjects for branch";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error('Delete branch subjects error:', errorMessage);
        toast({
          title: "Deletion failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error deleting branch subjects:', error);
      const errorMessage = error?.message || "An error occurred while deleting subjects. Please check the console for details.";
      toast({
        title: "Deletion failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleBulkImport = async () => {
    setImportError(null);
    setImportSuccess(null);
    setImportText(`[
  {
    "name": "Applied Mathematics I",
    "code": "AM101",
    "branch": "Computer Engineering",
    "semester": 1,
    "credits": 4,
    "hours": 60,
    "type": "Theory",
    "description": "Basic mathematics concepts for engineering"
  }
]`);
    setShowImportModal(true);
  };

  const submitImport = async () => {
    try {
      setImporting(true);
      setImportError(null);
      setImportSuccess(null);
      
      // Validate JSON format
      let payload: any;
      try {
        payload = JSON.parse(importText.trim());
      } catch (e) {
        const errorMsg = 'Invalid JSON format. Please check your JSON syntax.';
        setImportError(errorMsg);
        toast({
          title: "Import Failed",
          description: errorMsg,
          variant: "destructive",
        });
        setImporting(false);
        return;
      }
      
      // Validate array
      if (!Array.isArray(payload)) {
        const errorMsg = 'Data must be a JSON array. Example: [{ "name": "...", "code": "..." }]';
        setImportError(errorMsg);
        toast({
          title: "Import Failed",
          description: errorMsg,
          variant: "destructive",
        });
        setImporting(false);
        return;
      }
      
      if (payload.length === 0) {
        const errorMsg = 'The array is empty. Please add at least one subject.';
        setImportError(errorMsg);
        toast({
          title: "Import Failed",
          description: errorMsg,
          variant: "destructive",
        });
        setImporting(false);
        return;
      }
      
      // Validate each subject has required fields
      const requiredFields = ['name', 'code', 'branch', 'semester'];
      const validationErrors: string[] = [];
      payload.forEach((subject: any, index: number) => {
        requiredFields.forEach(field => {
          if (!subject[field] && subject[field] !== 0) {
            validationErrors.push(`Subject ${index + 1}: Missing required field "${field}"`);
          }
        });
        
        // Validate branch is one of the available branches
        if (subject.branch && !AVAILABLE_BRANCHES.includes(subject.branch)) {
          validationErrors.push(`Subject ${index + 1}: Invalid branch "${subject.branch}". Must be one of: ${AVAILABLE_BRANCHES.join(', ')}`);
        }
        
        // Validate semester is 1-6
        if (subject.semester && (subject.semester < 1 || subject.semester > 6)) {
          validationErrors.push(`Subject ${index + 1}: Semester must be between 1 and 6`);
        }
        
        // Validate type
        const validTypes = ['Theory', 'Practical', 'Project', 'Elective'];
        if (subject.type && !validTypes.includes(subject.type)) {
          validationErrors.push(`Subject ${index + 1}: Type must be one of: ${validTypes.join(', ')}`);
        }
      });
      
      if (validationErrors.length > 0) {
        const errorMsg = validationErrors.slice(0, 5).join('\n') + (validationErrors.length > 5 ? `\n... and ${validationErrors.length - 5} more errors` : '');
        setImportError(errorMsg);
        toast({
          title: "Validation Failed",
          description: `Found ${validationErrors.length} validation error(s). Please check the errors below.`,
          variant: "destructive",
        });
        setImporting(false);
        return;
      }
      
      // Send to backend
      const res = await fetch('/api/subjects/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
        body: JSON.stringify({ subjects: payload })
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        // Check if it's a Firebase initialization error
        const errorMsg = result?.error || 'Import failed';
        if (errorMsg.includes('Firebase is not initialized') || errorMsg.includes('Cannot read properties of undefined')) {
          throw new Error('Firebase database is not configured. Please contact the administrator to set up Firebase configuration.');
        }
        throw new Error(errorMsg);
      }
      
      // Success
      setImportSuccess({
        imported: result.imported || 0,
        errors: result.errors || 0,
        errorDetails: result.errorDetails || []
      });
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.imported} subject(s). ${result.errors > 0 ? `${result.errors} subject(s) failed.` : ''}`,
      });
      
      // Refresh subjects list
      await fetchSubjects();
      
      // Auto-close after 3 seconds if no errors
      if (result.errors === 0) {
        setTimeout(() => {
      setShowImportModal(false);
      setImportText('');
          setImportSuccess(null);
        }, 2000);
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Import failed. Please try again.';
      setImportError(errorMsg);
      toast({
        title: "Import Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subject Management</h2>
          <p className="text-gray-600">Manage MSBTE K-Scheme subjects</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBulkImport} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import K-Scheme
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Subject
          </Button>
          <Button 
            onClick={handleDeleteAllSubjects}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Subjects
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Branch</label>
              <div className="flex gap-2">
                <div className="flex-1">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 z-[100]">
                  {availableBranches.map(branch => (
                    <SelectItem key={branch} value={branch} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                </div>
                <Button 
                  onClick={handleDeleteAllSubjectsByBranch}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
                  title={`Delete all subjects for ${selectedBranch}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchSubjects} variant="outline" className="w-full">
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subjects ({filteredSubjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading subjects...</div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No subjects found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubjects.map((subject) => (
                    <tr key={subject._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{subject.name}</div>
                          <div className="text-sm text-gray-500 font-mono">{subject.code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">Semester {subject.semester}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary">{subject.type}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {subject.credits} credits
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSubject(subject)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSubject(subject._id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Subject</h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject Name *</label>
                <Input
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject Code *</label>
                <Input
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({...newSubject, code: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Branch *</label>
                  <Select value={newSubject.branch} onValueChange={(value) => setNewSubject({...newSubject, branch: value})}>
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 z-[100]">
                      {availableBranches.map(branch => (
                        <SelectItem key={branch} value={branch} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Semester *</label>
                  <Select value={newSubject.semester?.toString()} onValueChange={(value) => setNewSubject({...newSubject, semester: parseInt(value)})}>
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 z-[100]">
                      {semesters.map(sem => (
                        <SelectItem key={sem} value={sem.toString()} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
                          {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Add Subject
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bulk Import K-Scheme Subjects</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportError(null);
                  setImportSuccess(null);
                }}
                disabled={importing}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Format:</strong> Paste a JSON array of subjects. Each subject must include:
              </p>
              <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                <li><strong>name</strong> (required): Subject name</li>
                <li><strong>code</strong> (required): Subject code (e.g., "AM101")</li>
                <li><strong>branch</strong> (required): One of: {AVAILABLE_BRANCHES.join(', ')}</li>
                <li><strong>semester</strong> (required): 1-6</li>
                <li><strong>credits</strong> (optional): Number of credits (default: 4)</li>
                <li><strong>hours</strong> (optional): Number of hours (default: 60)</li>
                <li><strong>type</strong> (optional): Theory, Practical, Project, or Elective (default: Theory)</li>
                <li><strong>description</strong> (optional): Subject description</li>
              </ul>
            </div>
            
            <textarea
              className="w-full h-64 border rounded p-3 font-mono text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
                setImportSuccess(null);
              }}
              placeholder='[\n  {\n    "name": "Applied Mathematics I",\n    "code": "AM101",\n    "branch": "Computer Engineering",\n    "semester": 1,\n    "credits": 4,\n    "hours": 60,\n    "type": "Theory",\n    "description": "Basic mathematics concepts"\n  }\n]'
              disabled={importing}
            />
            
            {importError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 mb-1">Validation Errors:</p>
                    <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">{importError}</pre>
                  </div>
                </div>
              </div>
            )}
            
            {importSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 mb-1">
                      Import Complete: {importSuccess.imported} imported, {importSuccess.errors} failed
                    </p>
                    {importSuccess.errorDetails.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-green-700 mb-1">Failed subjects:</p>
                        <ul className="text-xs text-green-700 space-y-1">
                          {importSuccess.errorDetails.slice(0, 5).map((error: any, idx: number) => (
                            <li key={idx} className="font-mono">
                              {error.code}: {error.error}
                            </li>
                          ))}
                          {importSuccess.errorDetails.length > 5 && (
                            <li className="text-green-600">... and {importSuccess.errorDetails.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={submitImport} 
                disabled={importing || !importText.trim()}
                className="flex-1"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Subjects
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportError(null);
                  setImportSuccess(null);
                }} 
                disabled={importing}
              >
                Cancel
              </Button>
            </div>
            
            {importSuccess && importSuccess.errors === 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                This dialog will close automatically in 2 seconds...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Subject</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingSubject?._id) return;
                try {
                  const response = await fetch(`/api/subjects/${editingSubject._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
                    body: JSON.stringify({
                      name: editingSubject.name,
                      code: editingSubject.code,
                      branch: editingSubject.branch,
                      semester: editingSubject.semester,
                      credits: editingSubject.credits,
                      hours: editingSubject.hours,
                      type: editingSubject.type,
                      description: editingSubject.description || ''
                    })
                  });
                  if (response.ok) {
                    setEditingSubject(null);
                    fetchSubjects();
                  }
                } catch (error) {
                  console.error('Error updating subject:', error);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Subject Name *</label>
                <Input
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject Code *</label>
                <Input
                  value={editingSubject.code}
                  onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Branch *</label>
                  <Select value={editingSubject.branch} onValueChange={(value) => setEditingSubject({ ...editingSubject, branch: value })}>
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 z-[100]">
                      {availableBranches.map(branch => (
                        <SelectItem key={branch} value={branch} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Semester *</label>
                  <Select value={editingSubject.semester?.toString()} onValueChange={(value) => setEditingSubject({ ...editingSubject, semester: parseInt(value) })}>
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 z-[100]">
                      {semesters.map(sem => (
                        <SelectItem key={sem} value={sem.toString()} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
                          {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Credits</label>
                  <Input type="number" value={editingSubject.credits} onChange={(e) => setEditingSubject({ ...editingSubject, credits: parseInt(e.target.value || '0') })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hours</label>
                  <Input type="number" value={editingSubject.hours} onChange={(e) => setEditingSubject({ ...editingSubject, hours: parseInt(e.target.value || '0') })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <Select value={editingSubject.type} onValueChange={(value) => setEditingSubject({ ...editingSubject, type: value as Subject['type'] })}>
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 z-[100]">
                    <SelectItem value="Theory" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Theory</SelectItem>
                    <SelectItem value="Practical" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Practical</SelectItem>
                    <SelectItem value="Project" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Project</SelectItem>
                    <SelectItem value="Elective" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Elective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingSubject(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubjectManager;
