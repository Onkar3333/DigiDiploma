import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  ArrowLeft,
  Shield,
  Eye,
  Lock,
  FileText,
  Calendar,
  Mail
} from 'lucide-react';

const Privacy = () => {
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
            Privacy Policy
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Your privacy is important to us. Learn how we collect, use, and protect your information.
          </p>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center">
                <Shield className="w-8 h-8 mr-3 text-blue-600" />
                Privacy Policy
              </h2>
              <p className="text-slate-600 mb-4">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>
              <p className="text-slate-600">
                At DigiDiploma, we are committed to protecting your privacy and ensuring the security of your personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
            </div>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-2xl font-bold text-blue-900 flex items-center">
                  <Eye className="w-6 h-6 mr-2" />
                  Information We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Personal Information</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Name and contact information (email address, phone number)</li>
                      <li>Educational details (branch, semester, institution)</li>
                      <li>Account credentials and profile information</li>
                      <li>Academic records and study materials</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Usage Information</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Platform usage patterns and preferences</li>
                      <li>Study material downloads and interactions</li>
                      <li>Project submissions and collaborations</li>
                      <li>Communication with other users</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Technical Information</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Device information and browser details</li>
                      <li>IP address and location data</li>
                      <li>Cookies and similar tracking technologies</li>
                      <li>Log files and analytics data</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="text-2xl font-bold text-green-900 flex items-center">
                  <FileText className="w-6 h-6 mr-2" />
                  How We Use Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Platform Services</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Providing access to study materials and resources</li>
                      <li>Managing user accounts and profiles</li>
                      <li>Facilitating project collaborations and submissions</li>
                      <li>Enabling communication between students and faculty</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Improvement and Analytics</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Analyzing platform usage to improve services</li>
                      <li>Developing new features and functionality</li>
                      <li>Conducting research and surveys</li>
                      <li>Providing personalized recommendations</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Communication</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Sending important updates and notifications</li>
                      <li>Providing customer support and assistance</li>
                      <li>Sharing educational content and resources</li>
                      <li>Responding to inquiries and feedback</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="text-2xl font-bold text-purple-900 flex items-center">
                  <Lock className="w-6 h-6 mr-2" />
                  Data Security and Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Security Measures</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Encryption of sensitive data in transit and at rest</li>
                      <li>Secure authentication and access controls</li>
                      <li>Regular security audits and assessments</li>
                      <li>Compliance with industry security standards</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Data Retention</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Personal data is retained only as long as necessary</li>
                      <li>Academic records are preserved for educational purposes</li>
                      <li>Automatic deletion of inactive accounts</li>
                      <li>Secure disposal of data when no longer needed</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Your Rights</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Access and review your personal information</li>
                      <li>Request correction of inaccurate data</li>
                      <li>Delete your account and associated data</li>
                      <li>Opt-out of certain communications</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                <CardTitle className="text-2xl font-bold text-orange-900 flex items-center">
                  <Calendar className="w-6 h-6 mr-2" />
                  Updates and Changes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-slate-600 mb-4">
                  We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. 
                  We will notify you of any material changes by:
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>Posting the updated policy on our platform</li>
                  <li>Sending email notifications to registered users</li>
                  <li>Displaying prominent notices on our website</li>
                  <li>Updating the "Last updated" date at the top of this policy</li>
                </ul>
                <p className="text-slate-600 mt-4">
                  We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-2xl font-bold text-blue-900 flex items-center">
                  <Mail className="w-6 h-6 mr-2" />
                  Contact Us
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-slate-600 mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="space-y-2 text-slate-600">
                  <p><strong>Email:</strong> zagadechaitanya@gmail.com</p>
                  <p><strong>Location:</strong> Pune, Maharashtra, India</p>
                  <p><strong>Phone:</strong> +91 8432971897</p>
                </div>
                <p className="text-slate-600 mt-4">
                  We will respond to your inquiry within 48 hours and address any concerns you may have about your privacy and data protection.
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
            Have Questions About Privacy?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            We're committed to transparency and protecting your privacy. Contact us if you need clarification on any aspect of our privacy practices.
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

export default Privacy;
