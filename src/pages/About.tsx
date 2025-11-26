import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  Award, 
  Target, 
  Star,
  ArrowLeft,
  Code,
  Smartphone,
  Cpu,
  Brain,
  Globe,
  Shield,
  Zap,
  Car,
  Radio,
  Heart,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  User
} from 'lucide-react';

// Team Member Card Component
const TeamMemberCard = ({ 
  name, 
  role, 
  description, 
  imagePath, 
  borderColor, 
  gradientFrom, 
  gradientTo,
  roleColor
}: {
  name: string;
  role: string;
  description: string;
  imagePath: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  roleColor: string;
}) => {
  const [imageError, setImageError] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);

  const sourceCandidates = useMemo(() => {
    const match = imagePath.match(/(.*)\.(png|jpe?g|webp|svg)$/i);
    const base = match ? match[1] : imagePath.replace(/\/$/, '');
    const initial = imagePath;
    const candidates = initial ? [initial] : [];

    const addCandidate = (ext: string) => {
      const candidate = base ? `${base}.${ext}` : '';
      if (candidate && !candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    };

    addCandidate('png');
    addCandidate('jpg');
    addCandidate('jpeg');
    addCandidate('webp');

    return candidates.length > 0 ? candidates : [imagePath];
  }, [imagePath]);

  useEffect(() => {
    setSourceIndex(0);
    setImageError(false);
  }, [sourceCandidates]);

  const handleImageError = () => {
    setSourceIndex((prev) => {
      if (prev < sourceCandidates.length - 1) {
        return prev + 1;
      }
      setImageError(true);
      return prev;
    });
  };

  const currentSource = sourceCandidates[sourceIndex] ?? imagePath;

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow text-center overflow-hidden">
      <CardContent className="p-6">
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className={`w-full h-full rounded-full overflow-hidden border-4 ${borderColor} shadow-lg`}>
            {!imageError ? (
              <img 
                src={currentSource} 
                alt={name}
                className="w-full h-full object-cover"
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-full flex items-center justify-center`}>
                <User className="w-12 h-12 text-white" />
              </div>
            )}
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{name}</h3>
        <p className={`${roleColor} font-semibold mb-3`}>{role}</p>
        <p className="text-slate-600 text-sm leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
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
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    DigiDiploma
                  </h1>
                </div>
              </div>
            </div>
            
            <Link to="/">
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            About DigiDiploma
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Revolutionizing digital education with comprehensive study materials, project management, and interactive learning resources for diploma students.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-2xl font-bold text-blue-900 flex items-center gap-3">
                  <Target className="w-8 h-8 text-blue-600" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-slate-700 leading-relaxed">
                  To provide comprehensive digital learning solutions that empower diploma students with accessible, organized, and interactive educational resources. We strive to bridge the gap between traditional education and modern technology.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardTitle className="text-2xl font-bold text-purple-900 flex items-center gap-3">
                  <Star className="w-8 h-8 text-purple-600" />
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-slate-700 leading-relaxed">
                  To become the leading digital education platform for diploma students across India, fostering innovation, collaboration, and excellence in technical education through cutting-edge technology and user-centric design.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              What We Offer
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Comprehensive digital solutions designed specifically for diploma engineering students.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Study Materials</h3>
                <p className="text-slate-600 leading-relaxed">
                  Access to comprehensive study materials including PDFs, PPTs, videos, and handwritten notes organized by branch, semester, and subject.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                  <Code className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Project Management</h3>
                <p className="text-slate-600 leading-relaxed">
                  Showcase your projects, collaborate with peers, and build your portfolio with our integrated project management system.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Community</h3>
                <p className="text-slate-600 leading-relaxed">
                  Connect with fellow students, share knowledge, and participate in discussions across all engineering branches.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Engineering Branches
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Comprehensive coverage across all major diploma engineering branches.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Computer Engineering', icon: Code, color: 'blue' },
              { name: 'Information Technology', icon: Smartphone, color: 'green' },
              { name: 'Mechanical Engineering', icon: Cpu, color: 'orange' },
              { name: 'Electrical Engineering', icon: Zap, color: 'yellow' },
              { name: 'Civil Engineering', icon: Target, color: 'brown' },
              { name: 'Electronics & Telecommunication', icon: Radio, color: 'purple' },
              { name: 'Automobile Engineering', icon: Car, color: 'rose' },
              { name: 'Instrumentation Engineering', icon: Shield, color: 'teal' },
              { name: 'Artificial Intelligence & Machine Learning (AIML)', icon: Brain, color: 'cyan' },
              { name: 'Mechatronics Engineering', icon: Cpu, color: 'amber' }
            ].map((branch, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 bg-${branch.color}-100 rounded-xl flex items-center justify-center mb-4`}>
                    <branch.icon className={`w-6 h-6 text-${branch.color}-600`} />
          </div>
                  <h3 className="text-lg font-bold text-slate-900">{branch.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Dedicated professionals committed to revolutionizing digital education.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <TeamMemberCard
              name="Chaitanya Zagade"
              role="Founder"
              description="Leading DigiDiploma’s mission to make diploma education smarter, accessible, and future-ready."
              imagePath="/team/chaitanya-zagade.png"
              borderColor="border-blue-100"
              gradientFrom="from-blue-600"
              gradientTo="to-indigo-600"
              roleColor="text-blue-600"
            />
            <TeamMemberCard
              name="Onkar Bansode"
              role="Co-Founder & Developer"
              description="Co-driving DigiDiploma’s vision by architecting a seamless, scalable learning platform"
              imagePath="/team/onkar-bansode.png"
              borderColor="border-green-100"
              gradientFrom="from-green-600"
              gradientTo="to-blue-600"
              roleColor="text-green-600"
            />
            <TeamMemberCard
              name="Soham Gauraje"
              role="Technical Head"   
              description="Enhancing DigiDiploma’s impact through strong content and dynamic engagement."
              imagePath="/team/soham-gauraje.jpeg"
              borderColor="border-purple-100"
              gradientFrom="from-purple-600"
              gradientTo="to-pink-600"
              roleColor="text-purple-600"
            />
            <TeamMemberCard
              name="Tanmay Pawar"
              role="Marketing Head"
              description="Amplifying DigiDiploma’s reach by connecting students with powerful, digital learning."
              imagePath="/team/tanmay-pawar.png"
              borderColor="border-orange-100"
              gradientFrom="from-orange-600"
              gradientTo="to-red-600"
              roleColor="text-orange-600"
            />
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join thousands of students who have already discovered the power of digital education with DigiDiploma.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 text-lg font-semibold shadow-xl">
                <BookOpen className="w-6 h-6 mr-3" />
                Get Started Today
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white text-blue-600 hover:bg-white hover:text-blue-600 h-14 px-8 text-lg font-semibold">
                <MessageCircle className="w-6 h-6 mr-3" />
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About; 