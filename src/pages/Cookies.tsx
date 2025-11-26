import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  ArrowLeft,
  Cookie,
  Shield,
  Settings,
  Info,
  Calendar,
  Mail,
  Eye,
  Lock
} from 'lucide-react';

const Cookies = () => {
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
            Cookie Policy
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Learn how we use cookies to enhance your experience on DigiDiploma.
          </p>
        </div>
      </section>

      {/* Cookie Content */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center">
                <Cookie className="w-8 h-8 mr-3 text-blue-600" />
                Cookie Policy
              </h2>
              <p className="text-slate-600 mb-4">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>
              <p className="text-slate-600">
                This Cookie Policy explains how DigiDiploma uses cookies and similar technologies to recognize you when you visit our platform. 
                It explains what these technologies are and why we use them, as well as your rights to control our use of them.
              </p>
            </div>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-2xl font-bold text-blue-900 flex items-center">
                  <Info className="w-6 h-6 mr-2" />
                  What Are Cookies?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-slate-600 mb-4">
                  Cookies are small data files that are placed on your computer or mobile device when you visit a website. 
                  They are widely used by website owners to make their websites work, or to work more efficiently, 
                  as well as to provide reporting information.
                </p>
                <p className="text-slate-600">
                  Cookies set by the website owner (in this case, DigiDiploma) are called "first-party cookies". 
                  Cookies set by parties other than the website owner are called "third-party cookies". 
                  Third-party cookies enable third-party features or functionality to be provided on or through the website.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="text-2xl font-bold text-green-900 flex items-center">
                  <Settings className="w-6 h-6 mr-2" />
                  How We Use Cookies
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Essential Cookies</h3>
                    <p className="text-slate-600 mb-3">
                      These cookies are essential for the website to function properly. They enable basic functions like page navigation, 
                      access to secure areas, and form submissions.
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Authentication and security</li>
                      <li>Session management</li>
                      <li>User preferences</li>
                      <li>Form data preservation</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Analytics Cookies</h3>
                    <p className="text-slate-600 mb-3">
                      These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Page views and user behavior</li>
                      <li>Performance monitoring</li>
                      <li>Error tracking</li>
                      <li>User experience optimization</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Functional Cookies</h3>
                    <p className="text-slate-600 mb-3">
                      These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Language preferences</li>
                      <li>Theme settings</li>
                      <li>Personalized content</li>
                      <li>Feature preferences</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="text-2xl font-bold text-purple-900 flex items-center">
                  <Eye className="w-6 h-6 mr-2" />
                  Types of Cookies We Use
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Session Cookies</h3>
                    <p className="text-slate-600">
                      These cookies are temporary and are deleted when you close your browser. They are used to maintain your session 
                      and remember your actions during your visit.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Persistent Cookies</h3>
                    <p className="text-slate-600">
                      These cookies remain on your device for a set period or until you delete them. They are used to remember your 
                      preferences and settings across multiple visits.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Third-Party Cookies</h3>
                    <p className="text-slate-600">
                      These cookies are set by third-party services that we use, such as analytics providers, advertising networks, 
                      and social media platforms.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                <CardTitle className="text-2xl font-bold text-orange-900 flex items-center">
                  <Shield className="w-6 h-6 mr-2" />
                  Your Cookie Choices
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Browser Settings</h3>
                    <p className="text-slate-600 mb-3">
                      Most web browsers allow you to control cookies through their settings preferences. You can:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                      <li>Block all cookies</li>
                      <li>Allow only first-party cookies</li>
                      <li>Delete existing cookies</li>
                      <li>Set cookie preferences</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Cookie Consent</h3>
                    <p className="text-slate-600">
                      When you first visit our website, you will see a cookie consent banner. You can choose to accept all cookies, 
                      reject non-essential cookies, or customize your preferences.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Impact of Disabling Cookies</h3>
                    <p className="text-slate-600">
                      Please note that disabling certain cookies may affect the functionality of our website. Essential cookies 
                      are required for basic site functionality and cannot be disabled.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
                <CardTitle className="text-2xl font-bold text-yellow-900 flex items-center">
                  <Lock className="w-6 h-6 mr-2" />
                  Data Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Data Collection</h3>
                    <p className="text-slate-600">
                      Cookies may collect information such as your IP address, browser type, operating system, 
                      and pages visited. This information is used to improve our services and user experience.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Data Security</h3>
                    <p className="text-slate-600">
                      We implement appropriate security measures to protect the information collected through cookies 
                      against unauthorized access, alteration, disclosure, or destruction.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Third-Party Services</h3>
                    <p className="text-slate-600">
                      Some third-party cookies may collect data for their own purposes. We recommend reviewing the 
                      privacy policies of these third-party services for more information.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-2xl font-bold text-blue-900 flex items-center">
                  <Calendar className="w-6 h-6 mr-2" />
                  Updates to This Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-slate-600 mb-4">
                  We may update this Cookie Policy from time to time to reflect changes in our practices or applicable laws. 
                  We will notify you of any material changes by:
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>Posting the updated policy on our website</li>
                  <li>Sending email notifications to registered users</li>
                  <li>Displaying prominent notices on our platform</li>
                  <li>Updating the "Last updated" date</li>
                </ul>
                <p className="text-slate-600 mt-4">
                  We encourage you to review this Cookie Policy periodically to stay informed about how we use cookies.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="text-2xl font-bold text-green-900 flex items-center">
                  <Mail className="w-6 h-6 mr-2" />
                  Contact Us
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-slate-600 mb-4">
                  If you have any questions about our use of cookies or this Cookie Policy, please contact us:
                </p>
                <div className="space-y-2 text-slate-600">
                  <p><strong>Email:</strong> zagadechaitanya@gmail.com</p>
                  <p><strong>Location:</strong> Pune, Maharashtra, India</p>
                  <p><strong>Phone:</strong> +91 8432971897</p>
                </div>
                <p className="text-slate-600 mt-4">
                  We will respond to your inquiry within 48 hours and address any concerns you may have about our cookie practices.
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
            Have Questions About Cookies?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            We're committed to transparency about how we use cookies. Contact us if you need clarification on any aspect of our cookie policy.
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

export default Cookies;
