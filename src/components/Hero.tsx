import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Users, Award, Download, Sparkles, ArrowRight, Play, Star, Zap } from "lucide-react";

const Hero = () => {
  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-40 h-40 bg-primary-glow rounded-full animate-float-slow blur-sm"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-accent rounded-full animate-float-slow delay-300 blur-sm"></div>
        <div className="absolute bottom-32 left-1/4 w-28 h-28 bg-primary-glow rounded-full animate-float-slow delay-700 blur-sm"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-secondary rounded-full animate-float-slow delay-500 blur-sm"></div>
        <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-accent rounded-full animate-float-slow delay-1000 blur-sm"></div>
      </div>

      {/* Enhanced Floating Particles */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/5 w-2 h-2 bg-white rounded-full animate-pulse-slow"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse-slow delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse-slow delay-2000"></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-primary rounded-full animate-pulse-slow delay-1500"></div>
        <div className="absolute top-2/3 left-1/6 w-1.5 h-1.5 bg-accent rounded-full animate-pulse-slow delay-3000"></div>
      </div>

      {/* Enhanced Grid Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Enhanced Header */}
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="w-16 h-16 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-button hover:shadow-glow transition-all duration-300 hover:scale-110 group-hover:rotate-12">
                <BookOpen className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center animate-pulse-slow">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary">
                DigiDiploma
              </h1>
              <p className="text-sm text-primary-foreground/80 animate-glow-slow font-medium">
                Advanced Study Platform
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="btn-glass hover-scale"
          >
            <Play className="w-4 h-4 mr-2" />
            Get Started
          </Button>
        </header>

        {/* Enhanced Main Hero Content */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 glass rounded-full px-6 py-3 mb-8 animate-slide-up">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary-foreground">Revolutionizing Digital Education</span>
            <Star className="w-4 h-4 text-accent" />
          </div>
          
          <h2 className="text-6xl md:text-7xl font-bold text-primary-foreground mb-8 animate-slide-up leading-tight">
            DigiDiploma
            <span className="block text-gradient-primary">
              Platform
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-12 max-w-4xl mx-auto animate-slide-up delay-300 leading-relaxed text-balance">
            Advanced study platform for polytechnic students with real-time access to materials, quizzes, and progress tracking. 
            <span className="block text-lg text-primary-foreground/70 mt-3">
              Empowering diploma students with personalized learning experiences and comprehensive academic support.
            </span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-slide-up delay-500">
            <Button 
              size="lg" 
              className="btn-hero group h-14 px-8 text-lg"
            >
              <BookOpen className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
              Access Study Materials
              <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
            {/* Admin Panel button removed for security */}
          </div>
        </div>

        {/* Enhanced Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="glass-card p-8 hover-lift group relative overflow-hidden animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-button">
                <BookOpen className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-primary transition-colors">Study Materials</h3>
              <p className="text-muted-foreground leading-relaxed text-pretty">PDFs, PPTs, and handwritten notes organized by branch, semester, and subject with advanced search capabilities.</p>
            </div>
          </Card>

          <Card className="glass-card p-8 hover-lift group relative overflow-hidden animate-fade-in delay-200">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-accent rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-button">
                <Users className="w-10 h-10 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-accent transition-colors">10 Branches</h3>
              <p className="text-muted-foreground leading-relaxed text-pretty">Comprehensive coverage across all diploma engineering branches with specialized content for each field.</p>
            </div>
          </Card>

          <Card className="glass-card p-8 hover-lift group relative overflow-hidden animate-fade-in delay-400">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-card rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-button border border-border">
                <Award className="w-10 h-10 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-secondary transition-colors">6 Semesters</h3>
              <p className="text-muted-foreground leading-relaxed text-pretty">Complete semester-wise organization with interactive quizzes, assessments, and progress tracking.</p>
            </div>
          </Card>
        </div>

        {/* Enhanced Stats Section */}
        <div className="glass-card rounded-3xl p-12 animate-scale-in">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-foreground mb-3">Platform Statistics</h3>
            <p className="text-muted-foreground text-lg">Trusted by thousands of students across India</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-5xl font-bold text-gradient-primary mb-4 group-hover:scale-110 transition-transform duration-300">1000+</div>
              <div className="text-sm text-muted-foreground font-medium">Study Materials</div>
            </div>
            <div className="group">
              <div className="text-5xl font-bold text-gradient-primary mb-4 group-hover:scale-110 transition-transform duration-300">10</div>
              <div className="text-sm text-muted-foreground font-medium">Engineering Branches</div>
            </div>
            <div className="group">
              <div className="text-5xl font-bold text-gradient-primary mb-4 group-hover:scale-110 transition-transform duration-300">6</div>
              <div className="text-sm text-muted-foreground font-medium">Semesters Coverage</div>
            </div>
            <div className="group">
              <div className="text-5xl font-bold text-gradient-primary mb-4 group-hover:scale-110 transition-transform duration-300">24/7</div>
              <div className="text-sm text-muted-foreground font-medium">Access Available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;