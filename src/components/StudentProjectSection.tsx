import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Code,
  Smartphone,
  Cpu,
  Brain,
  HardDrive,
  BarChart,
  Bot,
  Star,
  Eye,
  Calendar,
  Users,
  Github,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Target,
  Award,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';

interface Project {
  _id: string;
  title: string;
  description: string;
  category: string;
  techStack: string[];
  studentId: string;
  studentName: string;
  branch: string;
  semester: number;
  status: 'Planning' | 'In Progress' | 'Testing' | 'Completed' | 'On Hold';
  githubLink?: string;
  demoLink?: string;
  collaborators: Array<{
    name: string;
    studentId: string;
    role: string;
  }>;
  mentor?: {
    name: string;
    email: string;
    department: string;
  };
  timeline: {
    startDate: string;
    expectedEndDate?: string;
    actualEndDate?: string;
  };
  milestones: Array<{
    _id: string;
    title: string;
    description: string;
    deadline: string;
    completed: boolean;
    completedDate?: string;
  }>;
  tags: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  likes: number;
  views: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StudentProjectSectionProps {
  currentUser: {
    studentId: string;
    name: string;
    branch: string;
    semester: number;
  };
}

const categoryIcons = {
  'Web Development': Code,
  'Mobile App': Smartphone,
  'IoT': Cpu,
  'AI/ML': Brain,
  'Hardware': HardDrive,
  'Data Science': BarChart,
  'Robotics': Bot,
  'Other': Target
};

const statusColors = {
  'Planning': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'Testing': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-100 text-green-800',
  'On Hold': 'bg-gray-100 text-gray-800'
};

const difficultyColors = {
  'Beginner': 'bg-green-100 text-green-800',
  'Intermediate': 'bg-yellow-100 text-yellow-800',
  'Advanced': 'bg-red-100 text-red-800'
};

const StudentProjectSection: React.FC<StudentProjectSectionProps> = ({ currentUser }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('');

  // Form state for creating new project
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: '',
    techStack: '',
    githubLink: '',
    demoLink: '',
    difficulty: 'Intermediate',
    tags: '',
    isPublic: true,
    expectedEndDate: ''
  });

  const categories = [
    'Web Development', 'Mobile App', 'IoT', 'AI/ML', 
    'Hardware', 'Data Science', 'Robotics', 'Other'
  ];

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch all public projects
      const publicResponse = await fetch('/api/projects?isPublic=true&limit=20', {
        headers: authService.getAuthHeaders()
      });
      const publicData = await publicResponse.json();
      
      // Fetch user's projects
      const userResponse = await fetch(`/api/projects?studentId=${currentUser.studentId}`, {
        headers: authService.getAuthHeaders()
      });
      const userData = await userResponse.json();
      
      if (publicResponse.ok && userResponse.ok) {
        setProjects(publicData.projects || []);
        setMyProjects(userData.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentUser.studentId]);

  const handleCreateProject = async () => {
    try {
      if (!newProject.title || !newProject.description || !newProject.category) {
        toast.error('Please fill in all required fields');
        return;
      }

      const projectData = {
        ...newProject,
        studentId: currentUser.studentId,
        studentName: currentUser.name,
        branch: currentUser.branch,
        semester: currentUser.semester,
        techStack: newProject.techStack.split(',').map(tech => tech.trim()).filter(Boolean),
        tags: newProject.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        timeline: {
          startDate: new Date().toISOString(),
          expectedEndDate: newProject.expectedEndDate || undefined
        }
      };

      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        toast.success('Project created successfully!');
        setIsCreateDialogOpen(false);
        setNewProject({
          title: '',
          description: '',
          category: '',
          techStack: '',
          githubLink: '',
          demoLink: '',
          difficulty: 'Intermediate',
          tags: '',
          isPublic: true,
          expectedEndDate: ''
        });
        fetchProjects(); // Refresh the projects list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleLikeProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/like`, {
        method: 'POST',
        headers: authService.getAuthHeaders()
      });

      if (response.ok) {
        fetchProjects(); // Refresh to show updated likes
      }
    } catch (error) {
      console.error('Error liking project:', error);
    }
  };

  const ProjectCard: React.FC<{ project: Project; isOwner?: boolean }> = ({ project, isOwner = false }) => {
    const CategoryIcon = categoryIcons[project.category] || Target;
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CategoryIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{project.title}</CardTitle>
            </div>
            <div className="flex gap-1">
              <Badge className={statusColors[project.status]}>
                {project.status}
              </Badge>
              <Badge className={difficultyColors[project.difficulty]}>
                {project.difficulty}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Tech Stack */}
            <div className="flex flex-wrap gap-1">
              {project.techStack.slice(0, 3).map((tech, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tech}
                </Badge>
              ))}
              {project.techStack.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{project.techStack.length - 3} more
                </Badge>
              )}
            </div>

            {/* Project Stats */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {project.likes}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {project.views}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {project.collaborators.length + 1}
                </div>
              </div>
              <div className="text-xs">
                {project.branch} • Sem {project.semester}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {project.githubLink && (
                <Button size="sm" variant="outline" asChild>
                  <a href={project.githubLink} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-1" />
                    Code
                  </a>
                </Button>
              )}
              {project.demoLink && (
                <Button size="sm" variant="outline" asChild>
                  <a href={project.demoLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Demo
                  </a>
                </Button>
              )}
              {!isOwner && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleLikeProject(project._id)}
                >
                  <Star className="h-4 w-4 mr-1" />
                  Like
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || project.category === filterCategory;
    const matchesStatus = !filterStatus || project.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Student Projects</h2>
          <p className="text-muted-foreground">
            Showcase your projects and discover what others are building
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newProject.title}
                  onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                  placeholder="Enter project title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  placeholder="Describe your project..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <Select value={newProject.category} onValueChange={(value) => setNewProject({...newProject, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Difficulty</label>
                  <Select value={newProject.difficulty} onValueChange={(value) => setNewProject({...newProject, difficulty: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Tech Stack</label>
                <Input
                  value={newProject.techStack}
                  onChange={(e) => setNewProject({...newProject, techStack: e.target.value})}
                  placeholder="React, Node.js, MongoDB (comma separated)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">GitHub Link</label>
                  <Input
                    value={newProject.githubLink}
                    onChange={(e) => setNewProject({...newProject, githubLink: e.target.value})}
                    placeholder="https://github.com/..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Demo Link</label>
                  <Input
                    value={newProject.demoLink}
                    onChange={(e) => setNewProject({...newProject, demoLink: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Tags</label>
                <Input
                  value={newProject.tags}
                  onChange={(e) => setNewProject({...newProject, tags: e.target.value})}
                  placeholder="web, react, api (comma separated)"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Expected End Date</label>
                <Input
                  type="date"
                  value={newProject.expectedEndDate}
                  onChange={(e) => setNewProject({...newProject, expectedEndDate: e.target.value})}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newProject.isPublic}
                  onChange={(e) => setNewProject({...newProject, isPublic: e.target.checked})}
                />
                <label htmlFor="isPublic" className="text-sm">
                  Make this project public (visible to other students)
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateProject} className="flex-1">
                  Create Project
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for My Projects vs All Projects */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="mine">My Projects ({myProjects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterCategory !== 'all' ? 'Try adjusting your search or filters' : 'Be the first to share a project!'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myProjects.map(project => (
              <ProjectCard key={project._id} project={project} isOwner={true} />
            ))}
          </div>

          {myProjects.length === 0 && (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building something amazing! Create your first project to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentProjectSection;
