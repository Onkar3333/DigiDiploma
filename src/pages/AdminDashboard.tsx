import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Code, Cpu, Layers, Globe, Star, Pencil, Trash2, Users, Settings, Bell, ClipboardList, GraduationCap, UserCog, TrendingUp, LogOut, Mail, FolderKanban, Briefcase, Menu, X, Download, Lock, User } from "lucide-react";
import axios from "axios";
import { authService } from '@/lib/auth';
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LoginForm from "@/components/LoginForm";
import StudentPanel from "@/components/StudentPanel";
import AdminSubjectManager from "@/components/AdminSubjectManager";
import AdminDashboardComponent from "@/components/AdminDashboard";
import ModernAdminDashboard from "@/components/ModernAdminDashboard";
import AdminNoticeManager from "@/components/AdminNoticeManager";
import AdminMaterialManager from "@/components/AdminMaterialManager";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import AdminMessageCenter from "@/components/AdminMessageCenter";
import AdminProjectsManager from "@/components/AdminProjectsManager";
import AdminCourseManager from "@/components/AdminCourseManager";
import AdminInternshipApplications from "@/components/AdminInternshipApplications";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType } from 'docx';

// Local material type since external helper was removed
type MaterialItem = { id: string; name: string; url: string; type: string; uploadedAt: string; subjectCode: string; downloads?: number; rating?: number };

type DashboardSummary = {
  totalStudents: number;
  totalAdmins: number;
  totalUsers: number;
  totalSubjects: number;
  totalMaterials: number;
  totalNotices: number;
  activeNotices: number;
  totalDownloads: number;
  avgRating: number;
  notices: Array<{ id: string; title: string; createdAt: string; author: string }>;
};

type AdminNotification = {
  id: string;
  type: 'contact' | 'project' | 'internship';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
};

const subjectIcons = [BookOpen, FileText, Code, Cpu, Layers, Globe, Star];

// ENTC Subject List for 6 Semesters
const ENTC_SUBJECTS = {
  "Electronics & Telecommunication": {
    2: [
      { name: "Applied Mathematics", code: "312301" },
      { name: "Basic Electronics", code: "312314" },
      { name: "Elements of Electrical Engineering", code: "312315" },
      { name: "Electronic Materials & Components", code: "312316" },
      { name: "Professional Communication", code: "312002" },
      { name: "Social and Life Skills", code: "312003" },
      { name: "Electronics Workshop Practice", code: "312008" },
      { name: "Programming in 'C' Language", code: "312009" }
    ],
    3: [
      { name: "Essence of Indian Constitution", code: "313304" },
      { name: "Basic Python Programming", code: "313306" },
      { name: "Analog Electronics", code: "313320" },
      { name: "Digital Techniques", code: "313322" },
      { name: "Electrical Circuits & Networks", code: "313326" },
      { name: "Principles of Electronic Communication", code: "313327" },
      { name: "Electronics Measurements & Instrumentation", code: "313007" }
    ],
    4: [
      { name: "Environmental Education and Sustainability", code: "314322" },
      { name: "Microcontroller & Applications", code: "314323" },
      { name: "Consumer Electronics", code: "314333" },
      { name: "Digital Communication", code: "314334" },
      { name: "Basic Power Electronics", code: "324304" },
      { name: "Electronic Equipment Maintenance & Simulation", code: "314011" },
      { name: "Open Elective", code: "314328" }
    ],
    5: [
      { name: "Entrepreneurship Development and Startups", code: "315302" },
      { name: "Embedded System", code: "315340" },
      { name: "Mobile & Wireless Communication", code: "315344" },
      { name: "Seminar and Project Initiation Course", code: "315002" },
      { name: "Internship (12 Weeks)", code: "315001" },
      { name: "IoT Applications", code: "315338" },
      { name: "Microwave Engineering & Radar System", code: "315346" }
    ],
    6: [
      { name: "Management", code: "316302" },
      { name: "Emerging Trends in Electronics", code: "316326" },
      { name: "Computer Network & Data Communication", code: "316330" },
      { name: "Optical Networking and Satellite Communication", code: "316331" },
      { name: "Capstone Project", code: "316001" },
      { name: "Drone Technology", code: "316328" },
      { name: "Control System & PLC", code: "316332" },
      { name: "VLSI Applications", code: "316333" }
    ]
  }
};

// Electrical Engineering Subject List for 6 Semesters
const ELECTRICAL_SUBJECTS = {
  "Electrical Engineering": {
    1: [
      { name: "Engineering Mathematics-I", code: "EE101" },
      { name: "Engineering Physics", code: "EE102" },
      { name: "Engineering Chemistry", code: "EE103" },
      { name: "Basic Electrical Engineering", code: "EE104" },
      { name: "Engineering Drawing", code: "EE105" },
      { name: "Communication Skills", code: "EE106" }
    ],
    2: [
      { name: "Engineering Mathematics-II", code: "EE201" },
      { name: "Electrical Circuits & Networks", code: "EE202" },
      { name: "Electronic Devices", code: "EE203" },
      { name: "Programming in C", code: "EE204" },
      { name: "Engineering Mechanics", code: "EE205" },
      { name: "Workshop Practice", code: "EE206" }
    ],
    3: [
      { name: "Engineering Mathematics-III", code: "EE301" },
      { name: "Electrical Machines-I", code: "EE302" },
      { name: "Electrical Measurements & Instrumentation", code: "EE303" },
      { name: "Analog Electronics", code: "EE304" },
      { name: "Power Electronics", code: "EE305" },
      { name: "Digital Electronics", code: "EE306" }
    ],
    4: [
      { name: "Engineering Mathematics-IV", code: "EE401" },
      { name: "Electrical Machines-II", code: "EE402" },
      { name: "Power Systems-I", code: "EE403" },
      { name: "Microprocessors & Applications", code: "EE404" },
      { name: "Control Systems", code: "EE405" },
      { name: "Electrical Workshop", code: "EE406" }
    ],
    5: [
      { name: "Power Systems-II", code: "EE501" },
      { name: "Switchgear & Protection", code: "EE502" },
      { name: "Utilization of Electrical Energy", code: "EE503" },
      { name: "Industrial Drives & Control", code: "EE504" },
      { name: "Renewable Energy Sources", code: "EE505" },
      { name: "Electrical Design, Estimation & Costing", code: "EE506" }
    ],
    6: [
      { name: "Electric Traction", code: "EE601" },
      { name: "Testing & Maintenance of Electrical Machines", code: "EE602" },
      { name: "Project Work", code: "EE603" },
      { name: "Industrial Training", code: "EE604" },
      { name: "Energy Management & Audit", code: "EE605" },
      { name: "Elective (Smart Grid/PLC/SCADA)", code: "EE606" }
    ]
  }
};

// Backend-powered subjects will be used in the Materials panel

const AdminDashboard: React.FC = () => {
  const { user, isAuthenticated, login, logout, refreshToken } = useAuth();
  const isAdmin = isAuthenticated && user?.userType === 'admin';
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [realtimeTick, setRealtimeTick] = useState(0);

  // Helper function for authenticated fetch with automatic token refresh
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = authService.getToken();
    if (!token) {
      console.error('❌ No authentication token found');
      logout();
      setShowLoginForm(true);
      throw new Error('Authentication required');
    }

    const headers = {
      ...authService.getAuthHeaders(),
      'Content-Type': 'application/json',
      ...options.headers
    };

    let response = await fetch(url, { ...options, headers });

    // If 401, try to refresh token and retry
    if (response.status === 401) {
      console.log('🔄 Token expired, attempting refresh...');
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry with new token
        const newHeaders = {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
          ...options.headers
        };
        response = await fetch(url, { ...options, headers: newHeaders });
        
        // If still 401 after refresh, something is wrong
        if (response.status === 401) {
          console.error('❌ Still unauthorized after token refresh');
          logout();
          setShowLoginForm(true);
          throw new Error('Session expired. Please log in again.');
        }
      } else {
        // Refresh failed - logout
        console.error('❌ Token refresh failed, logging out');
        logout();
        setShowLoginForm(true);
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  }, [logout, refreshToken]);

  // Initialize WebSocket connection for realtime updates
  useWebSocket({
    userId: user?.id || '',
    token: authService.getToken() || undefined,
    onMessage: (message) => {
      try {
        switch (message.type) {
          case 'authenticated':
            // no-op
            break;
          case 'material_uploaded':
          case 'material_updated':
          case 'material_deleted':
            // Refresh materials for currently selected subject
            fetchMaterials?.();
            break;
          case 'user_created':
          case 'user_updated':
          case 'user_deleted':
            // Refresh users list
            fetchUsers?.();
            break;
          case 'subject_created':
          case 'subject_updated':
          case 'subject_deleted':
          case 'subjects_import_completed':
            // Trigger refetch of branches/semesters/subjects via effects
            setRealtimeTick((t) => t + 1);
            break;
          case 'notice_created':
          case 'notice_updated':
          case 'notice_deleted':
            // Dashboard widgets that rely on notices can refetch via a generic tick
            setRealtimeTick((t) => t + 1);
            break;
          default:
            break;
        }
      } catch {}
    },
    onConnect: () => {
      console.log('Admin Dashboard WebSocket connected');
    },
    onDisconnect: () => {
      console.log('Admin Dashboard WebSocket disconnected');
    },
    onError: (error) => {
      console.error('Admin Dashboard WebSocket error:', error);
    }
  });

  // Check if user is authenticated and is admin
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginForm(true);
    } else if (user?.userType !== 'admin') {
      toast.error("Access denied. Admin privileges required.");
      logout();
      setShowLoginForm(true);
    } else {
      setShowLoginForm(false);
    }
  }, [isAuthenticated, user, logout, toast]);

  // Replace section and tab with a single activePanel state
  const [activePanel, setActivePanel] = useState('dashboard'); // default to 'dashboard'
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [subjects, setSubjects] = useState<any[]>([]);
  // Portal control state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // Profile/Password change state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [backendBranches, setBackendBranches] = useState<string[]>([]);
  const [backendSemesters, setBackendSemesters] = useState<number[]>([]);
  const [backendSubjects, setBackendSubjects] = useState<any[]>([]);
  const [editModal, setEditModal] = useState<{ open: boolean, subject: any, index: number | null }>({ open: false, subject: null, index: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, index: number | null }>({ open: false, index: null });
  const [editForm, setEditForm] = useState({ name: "", code: "" });

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [dashboardSummaryLoading, setDashboardSummaryLoading] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Keep sidebar visible on desktop even when dev tools open
  useEffect(() => {
    const checkViewport = () => {
      // On desktop (>= 768px), keep sidebar visible
      if (window.innerWidth >= 768) {
        // Sidebar should be visible on desktop via CSS, but ensure state is correct
        // Don't force it open, just ensure it doesn't get hidden by viewport changes
      }
    };
    
    // Check on mount and resize
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);
  
  // removed duplicate subjects state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    studentId: '',
    password: '',
    branch: '',
    semester: '',
    college: '',
    userType: 'student',
  });
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  // Add subject handler
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName || !newSubjectCode) return;
    // Add locally to current subjects list (demo only)
    setSubjects(prev => [...prev, { name: newSubjectName, code: newSubjectCode }]);
    setNewSubjectName('');
    setNewSubjectCode('');
    // Optionally, force a re-render
    // subjects state already updated
  };
  // REMOVE: const [showLogin, setShowLogin] = useState(false);
  // REMOVE: const isAdmin = localStorage.getItem('userRole') === 'admin';
  // REMOVE: if (!isAdmin) { ... }
  // Just render the dashboard for everyone

  // Refresh users when section changes to 'users' - only if authenticated and admin
  useEffect(() => {
    if (isAuthenticated && user?.userType === 'admin' && activePanel === 'users') {
      fetchUsers();
    }
  }, [activePanel, isAuthenticated, user]);

  // Load branches on mount and when realtimeTick changes - only if authenticated and admin
  useEffect(() => {
    if (isAuthenticated && user?.userType === 'admin') {
      const loadBranches = async () => {
        try {
          const res = await authenticatedFetch('/api/subjects/branches');
          if (!res.ok) throw new Error('Failed to fetch branches');
          const branches = await res.json();
          setBackendBranches(branches);
          if (branches.length > 0) setSelectedBranch(branches[0]);
        } catch (error) {
          console.error('Error loading branches:', error);
          setBackendBranches([]);
        }
      };
      loadBranches();
    } else {
      // Clear data when not authenticated
      setBackendBranches([]);
    }
  }, [isAuthenticated, user, realtimeTick]);

  // Load semesters when branch changes - only if authenticated and admin
  useEffect(() => {
    if (isAuthenticated && user?.userType === 'admin') {
      const loadSemesters = async () => {
        if (!selectedBranch) { setBackendSemesters([]); return; }
        try {
          const res = await authenticatedFetch(`/api/subjects/branches/${encodeURIComponent(selectedBranch)}/semesters`);
          if (!res.ok) throw new Error('Failed to fetch semesters');
          const sems = await res.json();
          setBackendSemesters(sems);
          if (sems.length > 0) setSelectedSemester(String(sems[0]));
        } catch (error) {
          console.error('Error loading semesters:', error);
          setBackendSemesters([]);
        }
      };
      loadSemesters();
    } else {
      // Clear data when not authenticated
      setBackendSemesters([]);
    }
  }, [selectedBranch, isAuthenticated, user, realtimeTick]);

  // Load subjects for selected branch (for Student Panel overview) - only if authenticated and admin
  useEffect(() => {
    if (isAuthenticated && user?.userType === 'admin') {
      const loadSubjects = async () => {
        try {
          const q = selectedBranch ? `?branch=${encodeURIComponent(selectedBranch)}` : '';
          const res = await authenticatedFetch(`/api/subjects${q}`);
          if (!res.ok) throw new Error('Failed to fetch subjects');
          const data = await res.json();
          setSubjects(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error loading subjects:', error);
          setSubjects([]);
        }
      };
      loadSubjects();
    } else {
      // Clear data when not authenticated
      setSubjects([]);
    }
  }, [selectedBranch, isAuthenticated, user, realtimeTick]);

  // Load subjects when branch or semester changes - only if authenticated and admin
  useEffect(() => {
    if (isAuthenticated && user?.userType === 'admin') {
      const loadSubjects = async () => {
        if (!selectedBranch || !selectedSemester) { setBackendSubjects([]); return; }
        try {
          const res = await authenticatedFetch(`/api/subjects?branch=${encodeURIComponent(selectedBranch)}&semester=${encodeURIComponent(selectedSemester)}`);
          if (!res.ok) throw new Error('Failed to fetch subjects');
          const subs = await res.json();
          setBackendSubjects(subs);
        } catch {
          setBackendSubjects([]);
        }
      };
      loadSubjects();
    } else {
      // Clear data when not authenticated
      setBackendSubjects([]);
    }
  }, [selectedBranch, selectedSemester, isAuthenticated, user]);

  // Deprecated local subject injection removed in favor of backend subjects


  // Maintenance API wiring
  const fetchMaintenance = async () => {
    try {
      const res = await fetch('/api/system/maintenance');
      if (!res.ok) return;
      const data = await res.json();
      setMaintenanceMode(!!data.maintenance);
    } catch {}
  };

  const setGlobalMaintenance = async (enabled: boolean) => {
    try {
      const res = await authenticatedFetch('/api/system/maintenance', {
        method: 'POST',
        body: JSON.stringify({ maintenance: enabled })
      });
      if (!res.ok) throw new Error('Failed to update maintenance');
      const data = await res.json();
      setMaintenanceMode(!!data.maintenance);
      toast(`Maintenance ${data.maintenance ? 'enabled' : 'disabled'}`);
    } catch {
      toast('Failed to update maintenance');
    }
  };

  useEffect(() => {
    if (activePanel === 'portal') {
      fetchMaintenance();
    }
  }, [activePanel]);



  const handleAddUser = async (e?: React.FormEvent, userData?: any) => {
    if (e) {
      e.preventDefault();
    }
    try {
      const data = userData || {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        college: newUser.college || 'Default College',
        studentId: newUser.studentId,
        branch: newUser.branch,
        semester: newUser.semester,
        userType: newUser.userType || 'student'
      };

      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast("User added successfully");
        setNewUser({ name: '', email: '', studentId: '', password: '', branch: '', semester: '', college: '', userType: 'student' });
        fetchUsers(); // Refresh the users list
        fetchDashboardSummary({ force: true });
      } else {
        const errorData = await res.json();
        toast(errorData.error || "Failed to add user");
      }
    } catch (err) {
      toast("Failed to add user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await authenticatedFetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast("User deleted successfully");
        fetchUsers(); // Refresh the users list
        fetchDashboardSummary({ force: true });
      } else {
        toast("Failed to delete user");
      }
    } catch (err) {
      toast("Failed to delete user");
    }
  };

  // Download functions for user data
  const downloadCSV = () => {
    if (users.length === 0) {
      toast.error("No users to download");
      return;
    }

    const headers = ['Name', 'Email', 'Branch', 'Semester', 'Enrollment Number', 'College', 'User Type'];
    const rows = users.map(user => [
      user.name || '',
      user.email || '',
      user.branch || '',
      user.semester || '',
      user.studentId || '',
      user.college || '',
      user.userType || 'student'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully");
  };

  const downloadExcel = () => {
    if (users.length === 0) {
      toast.error("No users to download");
      return;
    }

    const worksheetData = users.map(user => ({
      'Name': user.name || '',
      'Email': user.email || '',
      'Branch': user.branch || '',
      'Semester': user.semester || '',
      'Enrollment Number': user.studentId || '',
      'College': user.college || '',
      'User Type': user.userType || 'student'
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    
    // Auto-size columns
    const maxWidth = 50;
    const wscols = [
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 30 }, // Branch
      { wch: 10 }, // Semester
      { wch: 20 }, // Enrollment Number
      { wch: 30 }, // College
      { wch: 15 }  // User Type
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `users_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel file downloaded successfully");
  };

  const downloadWord = async () => {
    if (users.length === 0) {
      toast.error("No users to download");
      return;
    }

    try {
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Name", alignment: AlignmentType.LEFT })] }),
            new TableCell({ children: [new Paragraph({ text: "Email", alignment: AlignmentType.LEFT })] }),
            new TableCell({ children: [new Paragraph({ text: "Branch", alignment: AlignmentType.LEFT })] }),
            new TableCell({ children: [new Paragraph({ text: "Semester", alignment: AlignmentType.LEFT })] }),
            new TableCell({ children: [new Paragraph({ text: "Enrollment Number", alignment: AlignmentType.LEFT })] }),
            new TableCell({ children: [new Paragraph({ text: "College", alignment: AlignmentType.LEFT })] }),
            new TableCell({ children: [new Paragraph({ text: "User Type", alignment: AlignmentType.LEFT })] })
          ]
        })
      ];

      users.forEach(user => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: user.name || '' })] }),
              new TableCell({ children: [new Paragraph({ text: user.email || '' })] }),
              new TableCell({ children: [new Paragraph({ text: user.branch || '' })] }),
              new TableCell({ children: [new Paragraph({ text: user.semester || '' })] }),
              new TableCell({ children: [new Paragraph({ text: user.studentId || '' })] }),
              new TableCell({ children: [new Paragraph({ text: user.college || '' })] }),
              new TableCell({ children: [new Paragraph({ text: user.userType || 'student' })] })
            ]
          })
        );
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "User Management Data",
                  bold: true,
                  size: 32
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            new Table({
              rows: tableRows,
              width: {
                size: 100,
                type: WidthType.PERCENTAGE
              }
            })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Word document downloaded successfully");
    } catch (error) {
      console.error("Error generating Word document:", error);
      toast.error("Failed to generate Word document");
    }
  };

  const downloadPDF = () => {
    if (users.length === 0) {
      toast.error("No users to download");
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const startY = 20;
      let y = startY;

      // Title
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text('User Management Data', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Table headers
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      const colWidths = [35, 50, 40, 20, 30, 30];
      const headers = ['Name', 'Email', 'Branch', 'Sem', 'Enrollment', 'College'];
      let x = margin;

      headers.forEach((header, i) => {
        pdf.text(header, x, y);
        x += colWidths[i];
      });
      y += 7;

      // Table rows
      pdf.setFont(undefined, 'normal');
      users.forEach((user, index) => {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = startY;
        }

        x = margin;
        const rowData = [
          (user.name || '').substring(0, 20),
          (user.email || '').substring(0, 25),
          (user.branch || '').substring(0, 18),
          user.semester || '',
          (user.studentId || '').substring(0, 15),
          (user.college || '').substring(0, 18)
        ];

        rowData.forEach((data, i) => {
          pdf.text(data, x, y);
          x += colWidths[i];
        });
        y += 7;

        // Draw line after each row
        pdf.setLineWidth(0.1);
        pdf.line(margin, y - 2, pageWidth - margin, y - 2);
      });

      pdf.save(`users_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF file downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  // Material upload handler
  const handleMaterialUpload = async (subjectCode: string, e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        const dataBase64 = await toBase64(file);
        const uploadRes = await authenticatedFetch('/api/materials/upload-base64', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ filename: file.name, contentType: file.type, dataBase64 })
        });
        if (!uploadRes.ok) continue;
        const { url } = await uploadRes.json();
        const createRes = await authenticatedFetch('/api/materials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: `${type} - ${file.name}`,
            type: file.type.includes('pdf') ? 'pdf' : (file.type.startsWith('video') ? 'video' : 'document'),
            url,
            description: '',
            uploadedBy: 'admin',
            subjectId: selectedSubjectDropdown?.code || subjectCode,
            subjectName: selectedSubjectDropdown?.name || '',
            branch: selectedBranch,
            semester: selectedSemester,
            subjectCode
          })
        });
        if (createRes.ok) {
          const { material } = await createRes.json();
          setMaterials(prev => [...prev, {
            id: material._id,
            name: material.title,
            url: material.url,
            type: material.type,
            uploadedAt: material.createdAt,
            subjectCode: material.subjectCode
          }]);
        }
      } catch (err) {
        // ignore
      }
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const res = await authenticatedFetch(`/api/materials/${materialId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMaterials(prev => prev.filter(m => m.id !== materialId));
      }
    } catch {}
  };

  // Check if user is admin
  // REMOVE: const isAdmin = localStorage.getItem('userRole') === 'admin';

  // Remove the isAdmin check and login modal logic
  // Just render the dashboard for everyone

  // Add state for modal
  const [materialModal, setMaterialModal] = useState<{ open: boolean, subject: any | null }>({ open: false, subject: null });
  // Add state for add subject modal in Materials panel
  const [addSubjectModal, setAddSubjectModal] = useState(false);
  const [newMaterialSubjectName, setNewMaterialSubjectName] = useState('');
  const [newMaterialSubjectCode, setNewMaterialSubjectCode] = useState('');
  // Add state for selected subject in dropdown
  const [selectedSubjectDropdown, setSelectedSubjectDropdown] = useState<any | null>(null);
  // Fetch materials for selected subject from backend
  function fetchMaterials() {
    (async () => {
      if (!selectedSubjectDropdown?.code) { setMaterials([]); return; }
      try {
        const res = await authenticatedFetch(`/api/materials/subject/${encodeURIComponent(selectedSubjectDropdown.code)}`);
        if (!res.ok) throw new Error('Failed to fetch materials');
        const data = await res.json();
        const mapped: MaterialItem[] = data.map((m: any) => ({
          id: m._id,
          name: m.title,
          url: m.url,
          type: m.type,
          uploadedAt: m.createdAt,
          subjectCode: m.subjectCode
        }));
        setMaterials(mapped);
      } catch {
        setMaterials([]);
      }
    })();
  }

  useEffect(() => {
    fetchMaterials();
  }, [selectedSubjectDropdown?.code]);
  // Add state for course launches
  // Add state for selected student
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const lastSummaryFetchRef = useRef<number>(0);
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const addNotification = useCallback((entry: AdminNotification) => {
    setNotifications((prev) => {
      const exists = prev.find((notif) => notif.id === entry.id);
      if (exists) {
        return prev
          .map((notif) => (notif.id === entry.id ? { ...notif, ...entry, read: false } : notif))
          .slice(0, 25);
      }
      return [entry, ...prev].slice(0, 25);
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  }, []);

  const formatNotificationTime = useCallback((timestamp: string) => {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Just now";
    return date.toLocaleString();
  }, []);

  const handleNotificationNavigate = useCallback(async (type: 'contact' | 'project' | 'internship', notificationId?: string) => {
    if (notificationId) {
      // Mark as read in UI immediately
      setNotifications(prev => prev.map(notif => notif.id === notificationId ? { ...notif, read: true } : notif));
      
      // Mark as viewed in backend for persistence
      try {
        if (type === 'contact') {
          const id = notificationId.replace('contact-', '');
          await authenticatedFetch(`/api/contact/messages/${id}/view`, { method: 'PATCH' });
        } else if (type === 'project') {
          const id = notificationId.replace('project-', '');
          await authenticatedFetch(`/api/projects/requests/${id}/view`, { method: 'PATCH' });
        } else if (type === 'internship') {
          const id = notificationId.replace('internship-', '');
          await authenticatedFetch(`/api/internships/${id}/view`, { method: 'PATCH' });
        }
      } catch (error) {
        console.error('Failed to mark notification as viewed:', error);
        // Don't fail the navigation if marking as viewed fails
      }
    }
    setShowNotifications(false);
    if (type === 'contact') {
      setActivePanel('messages');
      window.dispatchEvent(new CustomEvent('messages:refresh', { detail: { type: 'contact' } }));
    } else if (type === 'project') {
      setActivePanel('projects');
      window.dispatchEvent(new CustomEvent('messages:refresh', { detail: { type: 'project' } }));
    } else if (type === 'internship') {
      setActivePanel('internships');
      window.dispatchEvent(new CustomEvent('messages:refresh', { detail: { type: 'internship' } }));
    }
  }, [authenticatedFetch]);

  const fetchDashboardSummary = useCallback(async (options: { force?: boolean } = {}) => {
    const { force } = options;
    const now = Date.now();
    if (!force && lastSummaryFetchRef.current && now - lastSummaryFetchRef.current < 30000) {
      return;
    }

    lastSummaryFetchRef.current = now;
    setDashboardSummaryLoading(true);
    try {
      const res = await authenticatedFetch('/api/dashboard/summary');
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      const data = await res.json();
      setDashboardSummary(data);
      lastSummaryFetchRef.current = Date.now();
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
    } finally {
      setDashboardSummaryLoading(false);
    }
  }, [authenticatedFetch]);

  const fetchInitialNotifications = useCallback(async () => {
    try {
      const [contactRes, projectRes, internshipRes] = await Promise.all([
        authenticatedFetch('/api/contact/messages'),
        authenticatedFetch('/api/projects/requests/all'),
        authenticatedFetch('/api/internships')
      ]);

      const contactData = contactRes.ok ? await contactRes.json() : [];
      const projectData = projectRes.ok ? await projectRes.json() : [];
      const internshipData = internshipRes.ok ? await internshipRes.json() : [];
      const internshipApplications = Array.isArray(internshipData?.applications) ? internshipData.applications : [];

      const contactNotifications: AdminNotification[] = Array.isArray(contactData)
        ? contactData.slice(0, 10).map((message: any) => ({
            id: `contact-${message.id}`,
            type: 'contact' as const,
            title: message.subject || 'New contact message',
            description: `${message.name || 'Unknown'} • ${message.email || 'No email provided'}`,
            timestamp: message.createdAt || new Date().toISOString(),
            // Mark as read only if explicitly viewed, otherwise unread
            read: Boolean(message.viewedAt)
          }))
        : [];

      const projectNotifications: AdminNotification[] = Array.isArray(projectData)
        ? projectData.slice(0, 10).map((request: any) => ({
            id: `project-${request.id}`,
            type: 'project' as const,
            title: request.projectIdea || request.title || 'New project request',
            description: `${request.name || 'Unknown'} • ${request.email || 'No email provided'}`,
            timestamp: request.createdAt || new Date().toISOString(),
            // Mark as read only if explicitly viewed, otherwise unread
            read: Boolean(request.viewedAt)
          }))
        : [];

      const internshipNotifications: AdminNotification[] = Array.isArray(internshipApplications)
        ? internshipApplications.slice(0, 10).map((application: any) => ({
            id: `internship-${application.id || application._id}`,
            type: 'internship' as const,
            title: `Internship Application - ${application.name || 'Unknown'}`,
            description: `${application.branch || 'N/A'} • ${application.type || 'N/A'} • ${application.email || 'No email'}`,
            timestamp: application.createdAt || application.submittedAt || new Date().toISOString(),
            // Mark as read only if explicitly viewed, otherwise unread
            read: Boolean(application.viewedAt)
          }))
        : [];
      
      console.log('📬 Fetched notifications:', {
        contact: contactNotifications.length,
        project: projectNotifications.length,
        internship: internshipNotifications.length,
        unreadContact: contactNotifications.filter(n => !n.read).length,
        unreadProject: projectNotifications.filter(n => !n.read).length,
        unreadInternship: internshipNotifications.filter(n => !n.read).length
      });

      const combined = [...contactNotifications, ...projectNotifications, ...internshipNotifications].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Always update notifications, but merge with existing to preserve read status
      // Also respect backend read status (viewedAt) for persistence across reloads
      setNotifications((prev) => {
        const existingMap = new Map(prev.map(n => [n.id, n]));
        const merged = combined.map(newNotif => {
          const existing = existingMap.get(newNotif.id);
          // If backend says it's read (viewedAt exists), use that
          // Otherwise, preserve frontend read status if it exists
          if (newNotif.read) {
            return newNotif; // Backend says it's read
          }
          if (existing && existing.read) {
            return existing; // Frontend says it's read (but backend hasn't updated yet)
          }
          return newNotif;
        });
        return merged.slice(0, 25);
      });
    } catch (error) {
      console.error('Failed to bootstrap notifications:', error);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchDashboardSummary({ force: true });
  }, [fetchDashboardSummary]);

  useEffect(() => {
    if (activePanel === 'dashboard') {
      fetchDashboardSummary({ force: true });
    }
  }, [activePanel, fetchDashboardSummary]);

  useEffect(() => {
    fetchInitialNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => {
      fetchInitialNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchInitialNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsPanelRef.current && !notificationsPanelRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live realtime updates via WebSocket notifications (admin side)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (!message?.type) return;
        switch (message.type) {
          // Users
          case 'user_created':
            setUsers(prev => [{
              _id: message.user.id,
              name: message.user.name,
              email: message.user.email,
              studentId: message.user.studentId,
              college: message.user.college,
              branch: message.user.branch,
              semester: message.user.semester,
              userType: message.user.userType,
              createdAt: message.user.createdAt
            }, ...prev]);
            toast.success(`New user added: ${message.user.name}`);
            fetchDashboardSummary();
            break;
          case 'user_updated':
            setUsers(prev => prev.map(u => u._id === message.user.id ? {
              ...u,
              name: message.user.name ?? u.name,
              email: message.user.email ?? u.email,
              branch: message.user.branch ?? u.branch,
              semester: message.user.semester ?? u.semester,
              userType: message.user.userType ?? u.userType
            } : u));
            toast.info(`User updated: ${message.user.name || 'User'}`);
            fetchDashboardSummary();
            break;
          case 'user_deleted':
            setUsers(prev => prev.filter(u => u._id !== message.userId));
            toast.info('User deleted');
            fetchDashboardSummary();
            break;

          // Subjects
          case 'subject_created':
            setSubjects(prev => [message.subject, ...prev]);
            // Update backendSubjects if it matches current branch/semester
            if (message.subject?.branch === selectedBranch && message.subject?.semester === parseInt(selectedSemester || '0')) {
              setBackendSubjects(prev => [message.subject, ...prev]);
            }
            // Update branches if new
            if (message.subject?.branch && !backendBranches.includes(message.subject.branch)) {
              setBackendBranches(prev => [...new Set([message.subject.branch, ...prev])]);
            }
            toast.success(`New subject added: ${message.subject.name}`);
            break;
          case 'subject_updated':
            setSubjects(prev => prev.map(s => s._id === message.subject._id ? message.subject : s));
            // Update backendSubjects if visible
            if (message.subject?.branch === selectedBranch && message.subject?.semester === parseInt(selectedSemester || '0')) {
              setBackendSubjects(prev => prev.map(s => s._id === message.subject._id ? message.subject : s));
            }
            toast.info(`Subject updated: ${message.subject.name}`);
            break;
          case 'subject_deleted':
            setSubjects(prev => prev.filter(s => s._id !== message.subjectId));
            // Update backendSubjects if visible
            setBackendSubjects(prev => prev.filter(s => s._id !== message.subjectId));
            toast.info('Subject deleted');
            break;

          // Materials
          case 'material_uploaded':
            // Refresh materials for current subject if visible
            if (selectedSubjectDropdown) {
              fetchMaterials();
            }
            toast.success('New material uploaded');
            fetchDashboardSummary();
            break;
          case 'material_deleted':
            setMaterials(prev => prev.filter(m => m.id !== message.materialId));
            toast.info('Material deleted');
            fetchDashboardSummary();
            break;
          case 'material_updated':
            setMaterials(prev => prev.map(m => m.id === message.material.id ? { ...m, ...message.material } : m));
            toast.info('Material updated');
            fetchDashboardSummary();
            break;

          // Notices
          case 'notice_published':
          case 'new_notice':
            // Refresh notices if on notice panel
            if (activePanel === 'notice') {
              // Trigger a refetch - AdminNoticeManager should handle this via its own WebSocket
              window.dispatchEvent(new CustomEvent('notice-updated'));
            }
            fetchDashboardSummary();
            break;
          case 'notice_updated':
            if (activePanel === 'notice') {
              window.dispatchEvent(new CustomEvent('notice-updated'));
            }
            fetchDashboardSummary();
            break;
          case 'notice_deleted':
            if (activePanel === 'notice') {
              window.dispatchEvent(new CustomEvent('notice-updated'));
            }
            fetchDashboardSummary();
            break;

          case 'contact_message_new': {
            const payload = message.message || {};
            toast.info(`Contact message from ${payload.name || 'User'}`, {
              description: `${payload.email || 'Unknown email'} • ${payload.preview || 'New inquiry received'}`
            });
            addNotification({
              id: `contact-${payload.id || Date.now()}`,
              type: 'contact',
              title: payload.subject || 'New contact message',
              description: `${payload.name || 'Unknown'} • ${payload.email || 'No email provided'}`,
              timestamp: payload.createdAt || new Date().toISOString(),
              read: false
            });
            window.dispatchEvent(new CustomEvent('messages:refresh', { detail: { type: 'contact' } }));
            break;
          }
          case 'project_request_new': {
            const payload = message.request || {};
            toast.info(`Project request from ${payload.name || 'Student'}`, {
              description: `${payload.email || 'Unknown email'} • ${payload.preview || 'New project request'}`
            });
            addNotification({
              id: `project-${payload.id || Date.now()}`,
              type: 'project',
              title: payload.title || payload.projectIdea || 'New project request',
              description: `${payload.name || 'Unknown'} • ${payload.email || 'No email provided'}`,
              timestamp: payload.createdAt || new Date().toISOString(),
              read: false
            });
            window.dispatchEvent(new CustomEvent('messages:refresh', { detail: { type: 'project' } }));
            break;
          }
          case 'internship_application_new': {
            const payload = message.application || {};
            toast.success(`New internship application from ${payload.name || 'Student'}`, {
              description: `${payload.email || 'Unknown email'} • ${payload.branch || ''} • Sem ${payload.semester || ''}`
            });
            addNotification({
              id: `internship-${payload.id || Date.now()}`,
              type: 'internship',
              title: `New internship application: ${payload.name || 'Unknown'}`,
              description: `${payload.collegeName || 'Unknown college'} • ${payload.type || 'N/A'} • ${payload.mode || 'N/A'}`,
              timestamp: payload.createdAt || new Date().toISOString(),
              read: false
            });
            window.dispatchEvent(new CustomEvent('internships:refresh'));
            fetchDashboardSummary();
            break;
          }
          case 'internship_application_deleted': {
            const applicationId = message.applicationId;
            window.dispatchEvent(new CustomEvent('internships:refresh'));
            fetchDashboardSummary();
            break;
          }

          // Maintenance mode
          case 'maintenance':
            setMaintenanceMode(!!message.maintenance);
            break;

        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    // Attach to existing WS if available
    const anyWindow: any = window as any;
    if (anyWindow?.webSocketInstance) {
      anyWindow.webSocketInstance.addEventListener('message', handler);
    }
    
    // Also listen for WebSocket connection events
    const checkConnection = setInterval(() => {
      if (!anyWindow?.webSocketInstance || anyWindow.webSocketInstance.readyState !== 1) {
        // WebSocket not connected - will reconnect automatically via useWebSocket hook
      }
    }, 5000);

    return () => {
      if (anyWindow?.webSocketInstance) {
        anyWindow.webSocketInstance.removeEventListener('message', handler);
      }
      clearInterval(checkConnection);
    };
  }, [selectedBranch, selectedSemester, selectedSubjectDropdown, activePanel, fetchDashboardSummary, addNotification]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await authenticatedFetch("/api/users");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
      toast("Failed to fetch users from database");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Material helpers
  const totalDownloads = materials.reduce((sum, m) => sum + (m.downloads || 0), 0);
  const averageRating = materials.length > 0
    ? (materials.reduce((sum, m) => sum + (m.rating || 0), 0) / materials.length)
    : 0;

  const handleRateMaterial = async (materialId: string, rating: number) => {
    try {
      const res = await authenticatedFetch(`/api/materials/${materialId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });
      if (res.ok) {
        setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, rating } : m));
      }
    } catch {}
  };

  // If not an admin, show the embedded login view
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Admin Dashboard
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please log in with admin credentials
            </p>
          </div>
          <LoginForm 
            onLogin={async (credentials) => {
              const success = await login(credentials);
              if (success) {
                setShowLoginForm(false);
              }
            }}
            onCreate={async (credentials) => {
              const success = await login(credentials);
              if (success) {
                setShowLoginForm(false);
              }
            }}
            onClose={() => setShowLoginForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Modern Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6 text-slate-700" />
                ) : (
                  <Menu className="w-6 h-6 text-slate-700" />
                )}
              </button>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm hidden sm:block">Manage your educational platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={notificationsPanelRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-4 px-1 bg-red-500 text-[10px] font-semibold text-white rounded-full flex items-center justify-center">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Notifications</p>
                        <p className="text-xs text-slate-500">Contact & project updates</p>
                      </div>
                      <button
                        className="text-xs text-white font-semibold text-slate-900 hover:text-slate-900 hover:underline underline-offset-2"
                        onClick={() => {
                          setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
                          setShowNotifications(false);
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 && (
                        <div className="p-6 text-center text-sm text-slate-500">
                          You're all caught up! Recent contact messages, project requests, and internship applications will appear here.
                        </div>
                      )}
                      {notifications.map((notification) => {
                        const getNotificationIcon = () => {
                          switch (notification.type) {
                            case 'contact':
                              return Mail;
                            case 'project':
                              return FolderKanban;
                            case 'internship':
                              return Briefcase;
                            default:
                              return Mail;
                          }
                        };
                        const NotificationIcon = getNotificationIcon();
                        const getIconColor = () => {
                          switch (notification.type) {
                            case 'contact':
                              return 'bg-blue-100 text-blue-700';
                            case 'project':
                              return 'bg-purple-100 text-purple-700';
                            case 'internship':
                              return 'bg-orange-100 text-orange-700';
                            default:
                              return 'bg-blue-100 text-blue-700';
                          }
                        };
                        return (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationNavigate(notification.type, notification.id)}
                            className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                              notification.read
                                ? 'bg-white hover:bg-slate-50'
                                : 'bg-white hover:bg-slate-100 border-l-4 border-blue-500'
                            }`}
                          >
                            <span
                              className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full ${getIconColor()}`}
                            >
                              <NotificationIcon className="w-4 h-4" />
                            </span>
                            <span className="flex-1 text-left">
                              <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                              <p className="text-xs text-slate-700">{notification.description}</p>
                              <p className="text-[11px] text-slate-600 mt-1">{formatNotificationTime(notification.timestamp)}</p>
                            </span>
                            {!notification.read && <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="px-4 py-2 border-t border-slate-100 text-center bg-white">
                      <button
                        className="text-xs text-white font-semibold text-slate-700 hover:text-slate-900 hover:underline underline-offset-2"
                        onClick={() => {
                          markAllNotificationsRead();
                          setShowNotifications(false);
                        }}
                      >
                        Mark all as read
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  window.location.href = '/';
                }}
                className="border-slate-300 hover:bg-slate-50"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Modern Sidebar */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 bg-white/95 md:bg-white/70 backdrop-blur-sm border-r border-white/20 p-6 flex flex-col gap-2
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          overflow-y-auto
        `}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Admin Panel</h2>
            <p className="text-sm text-slate-600">Manage your platform</p>
          </div>
          <div className="flex flex-col gap-2">
            {/* Card-style menu for all options */}
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'dashboard' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('dashboard');
                setSidebarOpen(false);
              }}
            >
              <Star className={`w-5 h-5 ${activePanel === 'dashboard' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Dashboard</span>
            </div>

            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'notice' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('notice');
                setSidebarOpen(false);
              }}
            >
              <Bell className={`w-5 h-5 ${activePanel === 'notice' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Notice Management</span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'users' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('users');
                setSidebarOpen(false);
              }}
            >
              <Users className={`w-5 h-5 ${activePanel === 'users' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">User Management</span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'portal' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('portal');
                setSidebarOpen(false);
              }}
            >
              <Settings className={`w-5 h-5 ${activePanel === 'portal' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Portal Control</span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'materials' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('materials');
                setSidebarOpen(false);
              }}
            >
              <Layers className={`w-5 h-5 ${activePanel === 'materials' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Materials</span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'subjects' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('subjects');
                setSidebarOpen(false);
              }}
            >
              <BookOpen className={`w-5 h-5 ${activePanel === 'subjects' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Subjects</span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'courses' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('courses');
                setSidebarOpen(false);
              }}
            >
              <BookOpen className={`w-5 h-5 ${activePanel === 'courses' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Courses</span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'messages' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('messages');
                setSidebarOpen(false);
              }}
            >
              <Mail className={`w-5 h-5 ${activePanel === 'messages' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Messages</span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'projects' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('projects');
                setSidebarOpen(false);
              }}
            >
              <FolderKanban className={`w-5 h-5 ${activePanel === 'projects' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Projects</span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePanel === 'internships' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('internships');
                setSidebarOpen(false);
              }}
            >
              <Briefcase className={`w-5 h-5 ${activePanel === 'internships' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Internship Applications</span>
            </div>
            
            {/* Profile Section */}
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                activePanel === 'profile' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                setActivePanel('profile');
                setSidebarOpen(false);
              }}
            >
              <UserCog className={`w-5 h-5 ${activePanel === 'profile' ? 'text-white' : 'text-slate-600'}`} />
              <span className="font-medium">Profile</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
        {/* Only render the selected panel's content */}
        {activePanel === 'dashboard' && (
          <ModernAdminDashboard 
            users={users}
            materials={materials}
            notices={dashboardSummary?.notices || []}
            maintenanceMode={maintenanceMode}
            summary={dashboardSummary}
            summaryLoading={dashboardSummaryLoading}
            notifications={notifications}
            onRefreshSummary={() => fetchDashboardSummary({ force: true })}
            onQuickAction={(key) => {
              switch (key) {
                case 'create_notice':
                  setActivePanel('notice');
                  break;
                case 'add_material':
                  setActivePanel('materials');
                  break;
                case 'manage_users':
                  setActivePanel('users');
                  break;
                case 'system_settings':
                  setActivePanel('portal');
                  break;
                default:
                  break;
              }
            }}
          />
        )}
        {activePanel === 'materials' && (
          <div>
            <AdminMaterialManager />
          </div>
        )}

        {activePanel === 'notice' && (
          <div>
            <AdminNoticeManager />
          </div>
        )}
        {activePanel === 'users' && (
                  <div>
            <h3 className="text-2xl font-bold mb-6 text-primary">User Management</h3>
            
            {/* Add User Form */}
            <div className="bg-white rounded-xl shadow-card p-6 mb-8">
              <h4 className="text-lg font-semibold mb-4">Add New User</h4>
              <form className="space-y-4" onSubmit={handleAddUser}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Name *</label>
                    <input 
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary" 
                      value={newUser.name} 
                      onChange={e => setNewUser({ ...newUser, name: e.target.value })} 
                      required 
                    />
                </div>
                  <div>
                    <label className="block mb-1 font-medium">Email *</label>
                    <input 
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary" 
                      type="email" 
                      value={newUser.email} 
                      onChange={e => setNewUser({ ...newUser, email: e.target.value })} 
                      required 
                    />
                </div>
              </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Enrollment Number *</label>
                    <input 
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary" 
                      value={newUser.studentId} 
                      onChange={e => setNewUser({ ...newUser, studentId: e.target.value })} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Branch *</label>
                <select
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary" 
                      value={newUser.branch} 
                      onChange={e => setNewUser({ ...newUser, branch: e.target.value })} 
                      required
                    >
                      <option value="">Select Branch</option>
                      <option value="Computer Engineering">Computer Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Instrumentation Engineering">Instrumentation Engineering</option>
                      <option value="Artificial Intelligence & Machine Learning (AIML)">Artificial Intelligence & Machine Learning (AIML)</option>
                      <option value="Mechatronics Engineering">Mechatronics Engineering</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Semester</label>
                <select
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary" 
                      value={newUser.semester} 
                      onChange={e => setNewUser({ ...newUser, semester: e.target.value })}
                    >
                      <option value="">Select Semester</option>
                      <option value="1">1st Semester</option>
                      <option value="2">2nd Semester</option>
                      <option value="3">3rd Semester</option>
                      <option value="4">4th Semester</option>
                      <option value="5">5th Semester</option>
                      <option value="6">6th Semester</option>
                </select>
              </div>
            </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                    <label className="block mb-1 font-medium">College *</label>
                    <input 
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary" 
                      value={newUser.college} 
                      onChange={e => setNewUser({ ...newUser, college: e.target.value })} 
                      placeholder="Enter college name"
                      required 
                    />
              </div>
              <div>
                    <label className="block mb-1 font-medium">Password *</label>
                    <input 
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary" 
                      type="password" 
                      value={newUser.password} 
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })} 
                      required 
                    />
              </div>
          </div>

                <button type="submit" className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/80 transition">
                  Add User
                </button>
              </form>
                      </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold">All Students</h4>
                  <p className="text-sm text-muted-foreground">Manage student accounts</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCSV}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadExcel}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadWord}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Word
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadPDF}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                </div>
              </div>
              
              {loadingUsers ? (
                <div className="p-8 text-center">
                  <div className="text-muted-foreground">Loading users...</div>
            </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user, index) => (
                        <tr key={user._id || user.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                </div>
                </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
              </div>
                </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.branch || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.semester ? `Sem ${user.semester}` : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">{user.studentId || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              className="text-red-600 hover:text-red-900 transition"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${user.name}?`)) {
                                  handleDeleteUser(user._id || user.id);
                                }
                              }}
                            >
                              Delete
                            </button>
                    </td>
                  </tr>
                ))}
                      {users.length === 0 && !loadingUsers && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            No users found. Add some users to get started.
                          </td>
                        </tr>
                )}
              </tbody>
            </table>
                </div>
              )}
            </div>
          </div>
        )}
        {activePanel === 'portal' && (
          <div>
            <h3 className="text-xl font-bold mb-6">Portal Control</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-background p-6 rounded-xl shadow-card">
                <h4 className="text-lg font-semibold mb-4 text-primary">Maintenance Mode</h4>
                <p className="text-muted-foreground">Current Status: {maintenanceMode ? 'On' : 'Off'}</p>
                <button className="btn-hero w-full mt-4" onClick={() => setGlobalMaintenance(!maintenanceMode)}>
                  Toggle Maintenance Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'subjects' && (
          <div className="w-full px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
            <AdminSubjectManager />
          </div>
        )}
        {activePanel === 'courses' && (
          <div className="w-full px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
            <AdminCourseManager />
          </div>
        )}
        {activePanel === 'internships' && (
          <div className="w-full px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
            <AdminInternshipApplications />
          </div>
        )}
        {/* Edit Subject Modal */}
        {editModal.open && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <form
              onSubmit={async e => {
                e.preventDefault();
                if (editModal.index !== null && editModal.subject && editModal.subject._id) {
                  try {
                    await axios.put(`/api/subjects/${editModal.subject._id}`, editForm);
                    toast.success("Subject updated successfully");
                    setEditModal({ open: false, subject: null, index: null });
                    // Refresh subjects (assume fetchSubjects is available)
                    // fetchSubjects(); // This function is not defined in the original file
                  } catch (err) {
                    toast.error("Failed to update subject");
                  }
                }
              }}
              className="bg-white dark:bg-card p-6 rounded shadow-lg w-full max-w-md"
            >
              <h2 className="text-lg font-semibold mb-4">Edit Subject</h2>
              <input
                className="w-full p-2 border rounded mb-2"
                placeholder="Subject Name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                className="w-full p-2 border rounded mb-4"
                placeholder="Subject Code"
                value={editForm.code}
                onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
                required
              />
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2 rounded bg-muted" onClick={() => setEditModal({ open: false, subject: null, index: null })}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-primary text-white">Save</button>
              </div>
            </form>
          </div>
        )}
        {/* Delete Subject Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-card p-6 rounded shadow-lg w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Delete Subject</h2>
              <p>Are you sure you want to delete this subject?</p>
              <div className="flex gap-2 justify-end mt-4">
                <button className="px-4 py-2 rounded bg-muted" onClick={() => setDeleteModal({ open: false, index: null })}>Cancel</button>
                <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={async () => {
                  if (deleteModal.index !== null && subjects[deleteModal.index]?._id) {
                    try {
                      await axios.delete(`/api/subjects/${subjects[deleteModal.index]._id}`);
                      toast.success("Subject deleted successfully");
                      setDeleteModal({ open: false, index: null });
                      // Refresh subjects
                      // fetchSubjects(); // This function is not defined in the original file
                    } catch (err) {
                      toast.error("Failed to delete subject");
                    }
                  }
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {activePanel === 'messages' && (
          <div className="p-8 max-w-7xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-primary">Contact Messages</h3>
            <AdminMessageCenter />
          </div>
        )}
        {activePanel === 'projects' && (
          <div className="p-8 max-w-7xl mx-auto">
            <AdminProjectsManager />
          </div>
        )}
        
        {activePanel === 'profile' && (
          <div className="w-full px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-4xl mx-auto">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Admin Profile</h2>
                    <p className="text-slate-600">{user?.email || user?.name || 'Admin User'}</p>
                  </div>
                </div>
                
                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Change Password
                  </h3>
                  
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      
                      // Validate passwords
                      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                        toast.error('Passwords do not match');
                        return;
                      }
                      
                      if (passwordForm.newPassword.length < 8) {
                        toast.error('Password must be at least 8 characters long');
                        return;
                      }
                      
                      // Check password requirements
                      const hasUpperCase = /[A-Z]/.test(passwordForm.newPassword);
                      const hasLowerCase = /[a-z]/.test(passwordForm.newPassword);
                      const hasNumber = /[0-9]/.test(passwordForm.newPassword);
                      const hasSpecialChar = /[!@#$%^&*]/.test(passwordForm.newPassword);
                      
                      if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
                        toast.error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
                        return;
                      }
                      
                      setChangingPassword(true);
                      try {
                        const response = await authenticatedFetch('/api/users/admin/change-password', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            newPassword: passwordForm.newPassword
                          })
                        });
                        
                        if (response.ok) {
                          toast.success('Password changed successfully!');
                          setPasswordForm({ newPassword: '', confirmPassword: '' });
                        } else {
                          const errorData = await response.json();
                          toast.error(errorData.error || 'Failed to change password');
                        }
                      } catch (error) {
                        console.error('Error changing password:', error);
                        toast.error('Failed to change password. Please try again.');
                      } finally {
                        setChangingPassword(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter new password"
                        required
                        minLength={8}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Must be at least 8 characters with uppercase, lowercase, number, and special character
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Confirm new password"
                        required
                        minLength={8}
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={changingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                    >
                      {changingPassword ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Changing Password...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </form>
                </div>
                
                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-2">Account Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Name:</span>
                      <span className="font-medium">{user?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Email:</span>
                      <span className="font-medium">{user?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">User Type:</span>
                      <span className="font-medium capitalize">{user?.userType || 'admin'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard; 