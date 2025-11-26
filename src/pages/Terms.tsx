import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  ArrowLeft,
  FileText,
  Shield,
  Users,
  BookOpen,
  Calendar,
  Mail,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const Terms = () => {
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
            Terms of Service
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Please read these terms carefully before using our platform.
          </p>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-blue-600" />
                Terms of Service
              </h2>
              <p className="text-slate-600 mb-4">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>
              <p className="text-slate-600">
                These Terms of Service ("Terms") govern your use of the DigiDiploma platform and services. 
                By accessing or using our platform, you agree to be bound by these Terms.
              </p>
            </div>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-2xl font-bold text-blue-900 flex items-center">
                  <Users className="w-6 h-6 mr-2" />
                  Acceptance of Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-slate-600 mb-4">
                  By accessing or using DigiDiploma, you agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, please do not use our platform.
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>You must be at least 13 years old to use our platform</li>
                  <li>You are responsible for maintaining the confidentiality of your account</li>
                  <li>You agree to provide accurate and complete information</li>
                  <li>You are responsible for all activities that occur under your account</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="text-2xl font-bold text-green-900 flex items-center">
                  <BookOpen className="w-6 h-6 mr-2" />
                  Platform Services
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Educational Resources</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Access to study materials and educational content</li>
                      <li>Project management and collaboration tools</li>
                      <li>Communication features between students and faculty</li>
                      <li>Progress tracking and academic support</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">User Responsibilities</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Use the platform for educational purposes only</li>
                      <li>Respect intellectual property rights</li>
                      <li>Maintain appropriate behavior and conduct</li>
                      <li>Report any violations or inappropriate content</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="text-2xl font-bold text-purple-900 flex items-center">
                  <Shield className="w-6 h-6 mr-2" />
                  Prohibited Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-slate-600 mb-4">
                  You agree not to engage in any of the following activities:
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>Violating any applicable laws or regulations</li>
                  <li>Infringing on intellectual property rights</li>
                  <li>Uploading malicious content or software</li>
                  <li>Harassing, bullying, or discriminating against others</li>
                  <li>Attempting to gain unauthorized access to our systems</li>
                  <li>Sharing inappropriate or offensive content</li>
                  <li>Using the platform for commercial purposes without permission</li>
                  <li>Attempting to reverse engineer or hack our platform</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                <CardTitle className="text-2xl font-bold text-orange-900 flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2" />
                  Intellectual Property
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Our Rights</h3>
                    <p className="text-slate-600">
                      DigiDiploma and its content are protected by copyright, trademark, and other intellectual property laws. 
                      You may not reproduce, distribute, or create derivative works without our permission.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Your Content</h3>
                    <p className="text-slate-600">
                      You retain ownership of content you upload, but grant us a license to use, display, and distribute 
                      your content in connection with our services.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Third-Party Content</h3>
                    <p className="text-slate-600">
                      Our platform may contain content from third parties. We are not responsible for the accuracy 
                      or reliability of such content.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
                <CardTitle className="text-2xl font-bold text-yellow-900 flex items-center">
                  <Calendar className="w-6 h-6 mr-2" />
                  Termination and Suspension
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Account Termination</h3>
                    <p className="text-slate-600">
                      We may terminate or suspend your account at any time for violations of these Terms or for any other reason.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Effect of Termination</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Your access to the platform will be immediately revoked</li>
                      <li>Your account data may be deleted</li>
                      <li>You will lose access to uploaded content</li>
                      <li>Provisions that survive termination will remain in effect</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-2xl font-bold text-blue-900 flex items-center">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Disclaimers and Limitations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Service Availability</h3>
                    <p className="text-slate-600">
                      We strive to maintain high availability but cannot guarantee uninterrupted access to our platform.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Content Accuracy</h3>
                    <p className="text-slate-600">
                      While we aim to provide accurate educational content, we cannot guarantee the completeness or accuracy of all materials.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Limitation of Liability</h3>
                    <p className="text-slate-600">
                      DigiDiploma shall not be liable for any indirect, incidental, special, or consequential damages.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="text-2xl font-bold text-green-900 flex items-center">
                  <Mail className="w-6 h-6 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-slate-600 mb-4">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="space-y-2 text-slate-600">
                  <p><strong>Email:</strong> zagadechaitanya@gmail.com</p>
                  <p><strong>Location:</strong> Pune, Maharashtra, India</p>
                  <p><strong>Phone:</strong> +91 8432971897</p>
                </div>
                <p className="text-slate-600 mt-4">
                  We will respond to your inquiry within 48 hours and address any concerns you may have about these terms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Have Questions About Our Terms?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            We're committed to transparency and fair use of our platform. Contact us if you need clarification on any aspect of our terms.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/contact">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 text-lg font-semibold shadow-xl">
                <Mail className="w-6 h-6 mr-3" />
                Contact Us
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 h-14 px-8 text-lg font-semibold">
                <ArrowLeft className="w-6 h-6 mr-3" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Terms;
