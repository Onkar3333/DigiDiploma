import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Cpu, 
  Zap, 
  Car, 
  Building2, 
  Hammer, 
  Radio, 
  Computer,
  Brain,
  Cog,
  ChevronRight,
  Sparkles,
  BookOpen,
  Users,
  Award,
  Star,
  ArrowRight
} from "lucide-react";

const branches = [
  {
    id: 'computer',
    name: 'Computer Engineering',
    code: 'CO',
    icon: Computer,
    description: 'Programming, Software Development, Web Technologies',
    subjects: 42,
    color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    gradient: 'from-blue-500/20 to-blue-600/20',
    features: ['Programming', 'Web Dev', 'Database'],
    stats: { students: 1200, materials: 150 }
  },
  {
    id: 'electronics',
    name: 'Electronics & Telecommunication',
    code: 'ENTC',
    icon: Radio,
    description: 'Circuit Design, Communication Systems, Embedded Systems',
    subjects: 38,
    color: 'bg-gradient-to-br from-green-500 to-green-600',
    gradient: 'from-green-500/20 to-green-600/20',
    features: ['Circuits', 'Communication', 'Embedded'],
    stats: { students: 980, materials: 120 }
  },
  {
    id: 'electrical',
    name: 'Electrical Engineering',
    code: 'EE',
    icon: Zap,
    description: 'Power Systems, Control Systems, Electrical Machines',
    subjects: 40,
    color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
    gradient: 'from-yellow-500/20 to-yellow-600/20',
    features: ['Power Systems', 'Control', 'Machines'],
    stats: { students: 1100, materials: 135 }
  },
  {
    id: 'mechanical',
    name: 'Mechanical Engineering',
    code: 'ME',
    icon: Hammer,
    description: 'Thermodynamics, Manufacturing, Machine Design',
    subjects: 44,
    color: 'bg-gradient-to-br from-red-500 to-red-600',
    gradient: 'from-red-500/20 to-red-600/20',
    features: ['Thermodynamics', 'Manufacturing', 'Design'],
    stats: { students: 1350, materials: 180 }
  },
  {
    id: 'civil',
    name: 'Civil Engineering',
    code: 'CE',
    icon: Building2,
    description: 'Structural Design, Construction, Environmental Engineering',
    subjects: 36,
    color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    gradient: 'from-purple-500/20 to-purple-600/20',
    features: ['Structural', 'Construction', 'Environmental'],
    stats: { students: 1050, materials: 125 }
  },
  {
    id: 'automobile',
    name: 'Automobile Engineering',
    code: 'AE',
    icon: Car,
    description: 'Vehicle Design, Engine Technology, Automotive Systems',
    subjects: 34,
    color: 'bg-gradient-to-br from-orange-500 to-orange-600',
    gradient: 'from-orange-500/20 to-orange-600/20',
    features: ['Vehicle Design', 'Engine Tech', 'Automotive'],
    stats: { students: 850, materials: 95 }
  },
  {
    id: 'instrumentation',
    name: 'Instrumentation Engineering',
    code: 'IE',
    icon: Cpu,
    description: 'Process Control, Measurement Systems, Automation',
    subjects: 32,
    color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    gradient: 'from-indigo-500/20 to-indigo-600/20',
    features: ['Process Control', 'Measurement', 'Automation'],
    stats: { students: 720, materials: 85 }
  },
  {
    id: 'aiml',
    name: 'Artificial Intelligence & Machine Learning (AIML)',
    code: 'AIML',
    icon: Brain,
    description: 'Data Science, Neural Networks, Deep Learning, AI Systems',
    subjects: 34,
    color: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    gradient: 'from-cyan-500/20 to-blue-600/20',
    features: ['Neural Networks', 'Data Science', 'Automation'],
    stats: { students: 640, materials: 90 }
  },
  {
    id: 'mechatronics',
    name: 'Mechatronics Engineering',
    code: 'MTRX',
    icon: Cog,
    description: 'Robotics, Smart Manufacturing, Intelligent Electromechanical Systems',
    subjects: 31,
    color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    gradient: 'from-emerald-500/20 to-teal-600/20',
    features: ['Robotics', 'Automation', 'Smart Systems'],
    stats: { students: 690, materials: 88 }
  }
];

interface BranchSelectionProps {
  onBranchSelect: (branchId: string) => void;
  userSelectedBranch?: string;
}

const BranchSelection = ({ onBranchSelect, userSelectedBranch }: BranchSelectionProps) => {
  // If user has a selected branch, show only that branch
  const branchesToShow = userSelectedBranch 
    ? branches.filter(branch => branch.id === userSelectedBranch)
    : branches;
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Enhanced Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 glass rounded-full px-6 py-3 mb-8 animate-slide-up">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Choose Your Path</span>
            <Star className="w-4 h-4 text-accent" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gradient-hero mb-8 animate-slide-up leading-tight">
            {userSelectedBranch ? 'Your Selected Branch' : 'Select Your Branch'}
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed text-balance animate-slide-up delay-200">
            {userSelectedBranch 
              ? 'This is your registered branch. You can continue to semester selection or change your branch.'
              : 'Choose your engineering branch to access semester-wise study materials, notes, and resources.'
            }
            <span className="block text-lg text-muted-foreground/80 mt-3">
              {userSelectedBranch 
                ? 'Click on your branch card to continue to semester selection.'
                : 'Each branch offers specialized content tailored to your field of study.'
              }
            </span>
          </p>
        </div>

        {/* Enhanced Branch Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
          {branchesToShow.map((branch, index) => {
            const IconComponent = branch.icon;
            return (
              <Card 
                key={branch.id}
                className="glass-card p-8 hover-lift cursor-pointer group relative overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => onBranchSelect(branch.id)}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${branch.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-20 h-20 ${branch.color} rounded-3xl flex items-center justify-center text-white shadow-button group-hover:scale-110 group-hover:shadow-glow transition-all duration-300`}>
                      <IconComponent className="w-10 h-10" />
                    </div>
                    <Badge variant="secondary" className="text-xs font-medium glass">
                      {branch.subjects} Subjects
                    </Badge>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-primary transition-colors duration-300">
                    {branch.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-xs font-mono glass">
                      {branch.code}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed text-pretty">
                    {branch.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {branch.features.map((feature, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs glass"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 glass rounded-xl">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{branch.stats.students}+</div>
                      <div className="text-xs text-muted-foreground">Students</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{branch.stats.materials}+</div>
                      <div className="text-xs text-muted-foreground">Materials</div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button 
                    variant="outline" 
                    className="w-full btn-glass group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Semesters
                    <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Enhanced Info Section */}
        <div className="text-center mb-16">
          <Card className="inline-flex items-center gap-6 p-8 glass-card max-w-md mx-auto animate-scale-in">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center">
              <Award className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-foreground mb-2">Need Help?</h4>
              <p className="text-sm text-muted-foreground text-pretty">
                Can't find your branch? Contact admin for assistance
              </p>
            </div>
          </Card>
        </div>

        {/* Enhanced Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-8 glass-card hover-lift animate-fade-in">
            <Users className="w-10 h-10 text-primary mx-auto mb-4" />
            <div className="text-3xl font-bold text-gradient-primary mb-2">7</div>
            <div className="text-sm text-muted-foreground font-medium">Engineering Branches</div>
          </div>
          <div className="text-center p-8 glass-card hover-lift animate-fade-in delay-200">
            <BookOpen className="w-10 h-10 text-primary mx-auto mb-4" />
            <div className="text-3xl font-bold text-gradient-primary mb-2">1000+</div>
            <div className="text-sm text-muted-foreground font-medium">Study Materials</div>
          </div>
          <div className="text-center p-8 glass-card hover-lift animate-fade-in delay-400">
            <Award className="w-10 h-10 text-primary mx-auto mb-4" />
            <div className="text-3xl font-bold text-gradient-primary mb-2">6</div>
            <div className="text-sm text-muted-foreground font-medium">Semesters Each</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchSelection;