import { useState, useEffect } from "react";
import Hero from "@/components/Hero";
import BranchSelection from "@/components/BranchSelection";
import FloatingBooksBackground from "@/components/FloatingBooksBackground";
import { useToast } from "@/hooks/use-toast";
import { useTypingEffect } from "@/hooks/useTypingEffect";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Sparkles,
  BookOpen,
  Users,
  Award,
  Star,
  ArrowRight,
  Play,
  Code,
  Smartphone,
  User,
  Cpu,
  Brain,
  Target,
  MessageCircle,
  Download,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Menu,
  Shield,
  HelpCircle,
  ChevronDown,
  GraduationCap,
  FileText,
  CreditCard,
  Lock,
  Globe,
  Send
} from "lucide-react";
import CollegeNoticeBoard from "@/components/CollegeNoticeBoard";
import ScrollingNoticeBoard from "@/components/ScrollingNoticeBoard";
import { getBranchImage } from "@/lib/branchImages";
import { ALL_BRANCHES } from "@/constants/branches";

const Index = () => {
  const [currentState, setCurrentState] = useState<'home' | 'branches'>('home');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 1250,
    faculty: 45,
    courses: 120,
    materials: 850
  });
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(true);
  const [popupEntered, setPopupEntered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Typing effect for "Welcome to DigiDiploma"
  const typingText = useTypingEffect({
    text: "Welcome to DigiDiploma",
    speed: 100,
    deleteSpeed: 50,
    pauseTime: 2000,
    pauseAfterDelete: 500,
  });

  // Launch a lightweight confetti burst when popup opens
  useEffect(() => {
    if (!showWhatsAppPopup) return;
    setPopupEntered(false);
    const raf = requestAnimationFrame(() => setPopupEntered(true));

    // Minimal canvas confetti implementation
    const durationMs = 1000;
    const end = Date.now() + durationMs;
    const colors = ["#60A5FA", "#818CF8", "#A78BFA", "#34D399", "#FBBF24"]; // blue/indigo themed

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 120 }).map(() => ({
      x: canvas.width / 2,
      y: canvas.height / 3,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 1.2) * 10,
      g: 0.25 + Math.random() * 0.2,
      size: 3 + Math.random() * 4,
      color: colors[(Math.random() * colors.length) | 0],
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2
    }));

    let frameId;
    const draw = () => {
      const now = Date.now();
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g;
        p.rotation += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      if (now < end) {
        frameId = requestAnimationFrame(draw);
      } else {
        cleanup();
      }
    };
    frameId = requestAnimationFrame(draw);

    const cleanup = () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      canvas.remove();
    };

    return () => {
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [showWhatsAppPopup]);

  useEffect(() => {
    // Always fetch public data for landing page
    fetchNotices();
    // Stats are kept static: 1250+ Active Students, 45+ Faculty Members, 120+ Courses Available, 850+ Study Materials
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/notices/public");
      const data = await res.json();
      setNotices(data);
    } catch (err) {
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };


  const handleBranchSelect = (branchId) => {
    toast({ title: "Branch Selected", description: "Redirecting to semester selection..." });
    navigate('/semester-selection', { state: { selectedBranch: branchId } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img
                  src="/icons/android-chrome-512x512.png"
                  alt="DigiDiploma logo"
                  className="w-10 h-10 rounded-xl shadow-lg object-contain"
                />
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    DigiDiploma
                  </h1>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
                Home
              </Link>
              <Link to="/materials" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
                Materials
              </Link>
              <Link to="/projects" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
                Projects
              </Link>
              <a href="/internship" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
                Internship
              </a>
              <Link to="/about" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
                About
              </Link>
              <Link to="/contact" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
                Contact
              </Link>
              <Button
                variant="outline"
                onClick={() => window.open('https://chat.whatsapp.com/BXyJ9ykaMnKKyHokiz2lII?mode=hqrt2', '_blank')}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Join Community
              </Button>
            </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className="absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg md:hidden z-50">
                <div className="flex flex-col py-2">
                  <Link
                    to="/"
                    className="group relative px-4 py-3 text-slate-700 font-medium transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 hover:shadow-sm hover:scale-[1.02] hover:pl-6"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">Home</span>
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </Link>
                  <Link
                    to="/materials"
                    className="group relative px-4 py-3 text-slate-700 font-medium transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 hover:shadow-sm hover:scale-[1.02] hover:pl-6"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">Materials</span>
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </Link>
                  <Link
                    to="/projects"
                    className="group relative px-4 py-3 text-slate-700 font-medium transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 hover:shadow-sm hover:scale-[1.02] hover:pl-6"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">Projects</span>
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </Link>
                  <a
                    href="/internship"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative px-4 py-3 text-slate-700 font-medium transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 hover:shadow-sm hover:scale-[1.02] hover:pl-6"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">Internship</span>
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </a>
                  <Link
                    to="/about"
                    className="group relative px-4 py-3 text-slate-700 font-medium transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 hover:shadow-sm hover:scale-[1.02] hover:pl-6"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">About</span>
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </Link>
                  <Link
                    to="/contact"
                    className="group relative px-4 py-3 text-slate-700 font-medium transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 hover:shadow-sm hover:scale-[1.02] hover:pl-6"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">Contact</span>
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </Link>
                  <div className="border-t border-slate-200 mt-2 pt-2 px-4 pb-2">
                    {/* Login removed in public build */}
                    <button
                      onClick={() => {
                        window.open('https://chat.whatsapp.com/BXyJ9ykaMnKKyHokiz2lII?mode=hqrt2', '_blank');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 border border-green-600 text-green-600 rounded-lg font-medium text-sm transition-all duration-300 hover:bg-green-50 hover:border-green-700 hover:text-green-700 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center group"
                    >
                      <MessageCircle className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                      Join Community
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 py-20">
        <FloatingBooksBackground />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-white/20">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-white font-medium">Revolutionizing Digital Education</span>
              <Star className="w-4 h-4 text-yellow-300" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="block">
                <span
                  className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent inline-block"
                  style={{
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    paddingLeft: '2px',
                    marginLeft: '-2px'
                  }}
                >
                  {typingText}
                </span>
                <span className="animate-pulse text-white">|</span>
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
              All your Diploma & Engineering free resources, affordable courses in one place with huge community
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Button
                size="lg"
                onClick={() => navigate('/open-dashboard')}
                className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <BookOpen className="w-6 h-6 mr-3" />
                Go to Dashboard
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/materials')}
                className="bg-black text-white hover:bg-gray-800 h-14 px-8 text-lg font-bold border-2 border-black"
              >
                <Download className="w-6 h-6 mr-3" />
                Get Free Resources
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/projects')}
                className="bg-emerald-600 text-white hover:bg-emerald-700 h-14 px-8 text-lg font-bold border-2 border-emerald-700"
              >
                <Download className="w-6 h-6 mr-3" />
                Download Free Projects
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.students}+</div>
                <div className="text-blue-200 text-sm">Active Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.faculty}+</div>
                <div className="text-blue-200 text-sm">Faculty Members</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.courses}+</div>
                <div className="text-blue-200 text-sm">Courses Available</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.materials}+</div>
                <div className="text-blue-200 text-sm">Study Materials</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* WhatsApp Join Popup */}
      <Dialog open={showWhatsAppPopup} onOpenChange={setShowWhatsAppPopup}>
        <DialogContent className={`sm:max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-[0_24px_100px_-30px_rgba(37,99,235,0.55)] fixed left-1/2 -translate-x-1/2 top-8 sm:top-12 transform transition-all duration-300 ${popupEntered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}>
          <DialogHeader className="p-0">
            <DialogTitle className="sr-only">Join our Group for IMPs</DialogTitle>
            <DialogDescription className="sr-only">Get exam updates and important questions. Join our WhatsApp community.</DialogDescription>
          </DialogHeader>
          <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-8 pt-8 pb-7 text-white">
            <div className="absolute inset-0 opacity-20" aria-hidden>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl"></div>
            </div>
            <div className="relative mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-full bg-[#25D366] shadow-xl ring-1 ring-white/20">
              <div className="absolute -inset-3 -z-10 rounded-full bg-[#25D366] blur-2xl opacity-50"></div>
              <img
                src="https://cdn.simpleicons.org/whatsapp/FFFFFF"
                alt="WhatsApp"
                className="h-10 w-10 drop-shadow"
                loading="eager"
                decoding="async"
              />
            </div>
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide ring-1 ring-white/20">
                Exclusive Community
              </div>
              <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Join our Group for IMPs</h3>
              <p className="mt-2 text-white/90 text-sm sm:text-base max-w-md mx-auto">
                Get all exam updates and study metarials with important questions.
              </p>
            </div>
          </div>
          <div className="bg-white p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg"
                onClick={() => {
                  window.open('https://chat.whatsapp.com/BXyJ9ykaMnKKyHokiz2lII?mode=hqrt2', '_blank');
                  setShowWhatsAppPopup(false);
                }}
              >
                Join Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-slate-200 hover:bg-slate-50"
                onClick={() => setShowWhatsAppPopup(false)}
              >
                Already Joined
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">No spam. Community announcements only.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Branch Selection Panel */}
      {currentState === 'branches' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto">
            <BranchSelection
              onBranchSelect={handleBranchSelect}
            />
          </div>
        </div>
      )}

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Choose DigiDiploma?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Experience the future of education with our comprehensive digital platform designed specifically for diploma students.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BookOpen className="w-8 h-8" />}
              title="Comprehensive Study Materials"
              description="Access PDFs, PPTs, videos, and handwritten notes organized by branch, semester, and subject with advanced search capabilities."
              color="blue"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="10 Engineering Branches"
              description="Complete coverage across Computer, IT, Mechanical, Electrical, Civil, ENTC, Automobile, Instrumentation, AIML, and Mechatronics engineering branches."
              color="green"
            />
            <FeatureCard
              icon={<Award className="w-8 h-8" />}
              title="6 Semester Structure"
              description="Organized semester-wise content with MSBTE K-Scheme subjects, quizzes, and progress tracking."
              color="purple"
            />
            <FeatureCard
              icon={<Code className="w-8 h-8" />}
              title="Project Management"
              description="Showcase your projects, collaborate with peers, and build your portfolio with our integrated project system."
              color="orange"
            />
            <FeatureCard
              icon={<Target className="w-8 h-8" />}
              title="Secure & Reliable"
              description="Enterprise-grade security with role-based access control, ensuring your data is always protected."
              color="red"
            />
            <FeatureCard
              icon={<Star className="w-8 h-8" />}
              title="24/7 Access"
              description="Access your learning materials anytime, anywhere with our responsive web platform and mobile optimization."
              color="indigo"
            />
          </div>
        </div>
      </section>

      {/* Branch Overview Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Available Engineering Branches
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Choose from our comprehensive range of diploma engineering programs designed for the modern industry.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <BranchCard
              icon={<Code className="w-8 h-8" />}
              title="Computer Engineering"
              description="Programming, software development, and computer systems with modern technologies."
              subjects={["Programming", "Database", "Web Development", "Networking"]}
              color="blue"
            />
            <BranchCard
              icon={<Smartphone className="w-8 h-8" />}
              title="Information Technology"
              description="IT infrastructure, software applications, and digital transformation solutions."
              subjects={["IT Fundamentals", "Software Engineering", "Cloud Computing", "Cybersecurity"]}
              color="green"
            />
            <BranchCard
              icon={<Cpu className="w-8 h-8" />}
              title="Mechanical Engineering"
              description="Machine design, manufacturing processes, and mechanical systems engineering."
              subjects={["Machine Design", "Thermodynamics", "Manufacturing", "CAD/CAM"]}
              color="orange"
            />
            <BranchCard
              icon={<Brain className="w-8 h-8" />}
              title="Electrical Engineering"
              description="Electrical systems, power generation, and electronic circuit design."
              subjects={["Circuit Theory", "Power Systems", "Electronics", "Control Systems"]}
              color="yellow"
            />
            <BranchCard
              icon={<Target className="w-8 h-8" />}
              title="Civil Engineering"
              description="Infrastructure development, construction management, and structural design."
              subjects={["Structural Analysis", "Construction", "Surveying", "Transportation"]}
              color="brown"
            />
            <BranchCard
              icon={<Brain className="w-8 h-8" />}
              title="ENTC Engineering"
              description="Electronics and telecommunications with modern communication systems."
              subjects={["Electronics", "Communication", "Signal Processing", "Telecom"]}
              color="purple"
            />
            <BranchCard
              icon={<Shield className="w-8 h-8" />}
              title="Instrumentation Engineering"
              description="Measurement systems, process control, and industrial instrumentation."
              subjects={["Sensors", "Process Control", "Automation", "Industrial IoT"]}
              color="purple"
            />
            <BranchCard
              icon={<Brain className="w-8 h-8" />}
              title="Artificial Intelligence & Machine Learning (AIML)"
              description="Data science, neural networks, and AI-driven automation projects."
              subjects={["AI Fundamentals", "Machine Learning", "Deep Learning", "MLOps"]}
              color="blue"
            />
            <BranchCard
              icon={<Cpu className="w-8 h-8" />}
              title="Mechatronics Engineering"
              description="Robotics, intelligent systems, and modern mechatronic integration."
              subjects={["Robotics", "Embedded Systems", "Sensors & Actuators", "Smart Manufacturing"]}
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              What Our Students Say
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Hear from students who have transformed their learning experience with DigiDiploma.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              name="Karan Jadhav"
              role="Vidya Prathisha Indapur"
              text="DigiDiploma has completely transformed how I study. The organized materials and project showcase features are incredible!"
              rating={5}
            />
            <TestimonialCard
              name="Tanishka Pokharkar"
              role="Government Polytechnic, Awasari (khurd)"
              text="The branch-specific content and semester organization make it so easy to find exactly what I need for my studies."
              rating={5}
            />
            <TestimonialCard
              name="Aditya Hule"
              role="Government Polytechnic, Awasari (khurd)"
              text="I love how I can access study materials 24/7 and collaborate on projects with my classmates. Highly recommended!"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* Enhanced FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 rounded-full px-6 py-2 mb-4">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600 font-medium">Frequently Asked Questions</span>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Got Questions? We've Got Answers
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Everything you need to know about DigiDiploma and how it can transform your learning journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-1" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-semibold text-slate-900">What is DigiDiploma and who is it for?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    DigiDiploma is a comprehensive digital learning platform designed specifically for diploma and engineering students.
                    It provides free study materials, project resources, course management, and a collaborative community.
                    Whether you're studying Computer Engineering, Mechanical, Civil, or any other branch, DigiDiploma has resources tailored to your needs.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Are the study materials really free?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Yes! All study materials including PDFs, PPTs, videos, and handwritten notes are completely free.
                    We believe in making quality education accessible to everyone. You can browse materials by branch, semester, and subject without any cost.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Code className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Which engineering branches are supported?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    We support all major engineering branches including Computer Engineering, Information Technology,
                    Mechanical, Electrical, Civil, ENTC, Automobile, Instrumentation, AIML, and Mechatronics Engineering.
                    Each branch has dedicated resources organized by semester and subject.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-semibold text-slate-900">How do I create an account?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Creating an account is simple and free! Click on the "Login" button, then select "Create Account".
                    Fill in your details including your name, email, enrollment number, college, branch, and semester.
                    Once registered, you'll have full access to all features and materials.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-5" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Download className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Can I download materials for offline use?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Yes, you can download PDFs, PPTs, and other study materials directly to your device for offline access.
                    This allows you to study anytime, anywhere, even without an internet connection.
                    Simply click the download button on any material you want to save.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-pink-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Is there a community or forum for students?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Absolutely! We have an active WhatsApp community where students can connect, share resources,
                    discuss projects, and help each other. You can join our community through the "Join Community" button
                    on the homepage. It's a great place to network and collaborate with fellow students.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Is my personal information secure?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Your privacy and security are our top priorities. We use industry-standard encryption to protect your data,
                    and we never share your personal information with third parties. Your account is password-protected,
                    and you have full control over your profile information.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Can I access DigiDiploma on mobile devices?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Yes! DigiDiploma is fully responsive and works seamlessly on smartphones, tablets, and desktops.
                    You can access all features, browse materials, and manage your courses from any device.
                    The mobile-friendly interface ensures a great experience on the go.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-600 mb-4">Still have questions?</p>
            <Button
              onClick={() => navigate('/contact')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Learning Experience?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join thousands of students who have already discovered the power of digital education with DigiDiploma.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/open-dashboard')}
              className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 text-lg font-semibold shadow-xl"
            >
              <BookOpen className="w-6 h-6 mr-3" />
              Go to Dashboard
            </Button>
            <Button
              size="lg"
              onClick={() => navigate('/contact')}
              className="bg-black text-white hover:bg-gray-800 h-14 px-8 text-lg font-bold border-2 border-black"
            >
              <Phone className="w-6 h-6 mr-3" />
              Get Support
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Main Footer Content */}
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src="/icons/android-chrome-512x512.png"
                  alt="DigiDiploma logo"
                  className="w-12 h-12 rounded-2xl object-contain shadow-lg"
                />
                <div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    DigiDiploma
                  </h3>
                  <p className="text-slate-300 text-sm">Revolutionizing Digital Education</p>
                </div>
              </div>
              <p className="text-slate-300 mb-6 max-w-md leading-relaxed">
                Empowering diploma students with comprehensive study materials, project management, and interactive learning resources. Experience the future of education with our advanced digital platform.
              </p>

              {/* Social Media Links */}
              <div className="flex space-x-3">
                <SocialLink
                  href="https://www.instagram.com/digi_diploma.in?igsh=eHM5MjZteHVmbjlv"
                  icon={<Instagram className="w-5 h-5" />}
                  label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                />
                <SocialLink
                  href="https://chat.whatsapp.com/BXyJ9ykaMnKKyHokiz2lII?mode=hqrt2"
                  icon={<MessageCircle className="w-5 h-5" />}
                  label="WhatsApp"
                  target="_blank"
                  rel="noopener noreferrer"
                />
                <SocialLink
                  href="https://t.me/digidiploma"
                  icon={
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  }
                  label="Telegram"
                  target="_blank"
                  rel="noopener noreferrer"
                />
                <SocialLink
                  href="https://www.linkedin.com/in/chaitanya-zagade-766051294?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                  icon={<Linkedin className="w-5 h-5" />}
                  label="LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                />
                <SocialLink
                  href="https://www.youtube.com/@DigiDiploma"
                  icon={<Youtube className="w-5 h-5" />}
                  label="YouTube"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center">
                    <ArrowRight className="w-3 h-3 mr-2" />
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center">
                    <ArrowRight className="w-3 h-3 mr-2" />
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center">
                    <ArrowRight className="w-3 h-3 mr-2" />
                    Contact
                  </Link>
                </li>
                <li>
                  {/* Login link removed in public build */}
                </li>
              </ul>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Contact Information</h4>
              <ul className="space-y-4">
                <li className="flex items-start text-slate-300">
                  <MapPin className="w-5 h-5 mr-3 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm">Pune, Maharashtra, India</p>
                  </div>
                </li>
                <li className="flex items-start text-slate-300">
                  <Mail className="w-5 h-5 mr-3 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm">digidiploma06@gmail.com</p>
                  </div>
                </li>
                <li className="flex items-start text-slate-300">
                  <Phone className="w-5 h-5 mr-3 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm">+91 8432971897</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Additional Footer Sections */}
          <div className="grid md:grid-cols-3 gap-8 mb-12 pt-8 border-t border-slate-700">
            {/* Features */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Platform Features</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Study Materials Management</li>
                <li>• Project Showcase</li>
                <li>• Branch-wise Organization</li>
                <li>• Semester Structure</li>
                <li>• Interactive Learning</li>
                <li>• Progress Tracking</li>
              </ul>
            </div>

            {/* Branches */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Branches Available</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                {ALL_BRANCHES.map((branch, index) => (
                  <li key={index}>• {branch}</li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Support & Help</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• 24/7 Technical Support</li>
                <li>• User Documentation</li>
                <li>• FAQ Section</li>
                <li>• Video Tutorials</li>
                <li>• Community Forum</li>
                <li>• Feedback System</li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-slate-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-center md:text-left mb-4 md:mb-0">
                <p className="text-slate-400 text-sm">
                  &copy; {new Date().getFullYear()} DigiDiploma. All rights reserved.
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Designed and Developed by{' '}
                  <a
                    href="https://github.com/Onkar3333/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors duration-200"
                  >
                    Onkar Bansode
                  </a>
                </p>
              </div>

              <div className="flex items-center space-x-6">
                <Link to="/privacy" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
                  Terms of Service
                </Link>
                <Link to="/cookies" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Component definitions
const FeatureCard = ({ icon, title, description, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
    red: "bg-red-50 border-red-200 text-red-600",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-600"
  };

  return (
    <Card className="p-8 hover:shadow-xl transition-all duration-300 border-0 bg-white">
      <div className={`w-16 h-16 ${colorClasses[color]} rounded-2xl flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </Card>
  );
};

const BranchCard = ({ icon, title, description, subjects, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-600",
    brown: "bg-amber-50 border-amber-200 text-amber-600"
  };

  const branchImage = getBranchImage(title);

  return (
    <Card className="p-6 hover:shadow-xl transition-all duration-300 border-0 bg-white overflow-hidden group">
      <div className="relative mb-4">
        <div className={`w-full h-32 ${colorClasses[color]} rounded-xl flex items-center justify-center relative overflow-hidden`}>
          <img
            src={branchImage}
            alt={`${title} theme`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              // Fallback to icon if image fails to load
              e.currentTarget.style.display = 'none';
            }}
            onLoad={(e) => {
              // Ensure image is visible when loaded
              e.currentTarget.style.opacity = '1';
            }}
            style={{ opacity: 0.9 }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/30"></div>
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className={`w-14 h-14 ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm bg-white/70 group-hover:scale-110 transition-transform duration-300`}>
              {icon}
            </div>
          </div>
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {subjects.map((subject, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {subject}
          </Badge>
        ))}
      </div>
    </Card>
  );
};

const TestimonialCard = ({ name, role, text, rating }) => (
  <Card className="p-8 hover:shadow-xl transition-all duration-300 border-0 bg-white">
    <div className="flex items-center mb-4">
      {[...Array(rating)].map((_, i) => (
        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
      ))}
    </div>
    <p className="text-slate-600 mb-6 italic">"{text}"</p>
    <div>
      <div className="font-semibold text-slate-900">{name}</div>
      <div className="text-sm text-slate-500">{role}</div>
    </div>
  </Card>
);

const SocialLink = ({ href, icon, label = "", target = "_blank", rel = "noopener noreferrer" }) => (
  <a
    href={href}
    target={target}
    rel={rel}
    className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
    title={label}
    aria-label={label}
  >
    {icon}
  </a>
);

export default Index;
