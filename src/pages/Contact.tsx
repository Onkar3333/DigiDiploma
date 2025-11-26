import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  GraduationCap, 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Send,
  Clock,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  CheckCircle,
  Code,
  FileText,
  HelpCircle,
  User,
  Download,
  Users,
  Lock,
  BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [projectRequest, setProjectRequest] = useState({
    name: '',
    email: '',
    phone: '',
    branch: '',
    semester: '',
    projectIdea: '',
    description: '',
    requiredTools: '',
    deadline: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to submit');
      toast({
        title: 'Message Sent! 🎉',
        description: "Thank you for contacting us. We'll get back to you soon!",
      });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast({ title: 'Submission failed', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRequestChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setProjectRequest({
      ...projectRequest,
      [e.target.name]: e.target.value
    });
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRequest(true);
    try {
      const res = await fetch('/api/projects/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectRequest)
      });
      if (!res.ok) throw new Error('Failed to submit');
      toast({
        title: 'Project Request Submitted! 🎉',
        description: "We'll review your request and get back to you soon!",
      });
      setProjectRequest({
        name: '', email: '', phone: '', branch: '', semester: '',
        projectIdea: '', description: '', requiredTools: '', deadline: '', notes: ''
      });
    } catch (err) {
      toast({ title: 'Submission failed', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

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
            Contact Us
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Get in touch with our team. We're here to help you with any questions about DigiDiploma.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form & Project Request */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Get in Touch</h2>
              <Card className="border-0 shadow-xl">
                <CardContent className="p-8">
                  <Tabs defaultValue="contact" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="contact">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact Us
                      </TabsTrigger>
                      <TabsTrigger value="project-request">
                        <Code className="w-4 h-4 mr-2" />
                        Request Project
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="contact">
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Name *
                            </label>
                            <Input
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              placeholder="Your full name"
                              required
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Email *
                            </label>
                            <Input
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="your.email@example.com"
                              required
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Phone
                            </label>
                            <Input
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="+91 8432971897"
                              className="w-full"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Subject *
                          </label>
                          <Input
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            placeholder="What's this about?"
                            required
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Message *
                          </label>
                          <Textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="Tell us more about your inquiry..."
                            rows={6}
                            required
                            className="w-full"
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-lg font-semibold"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5 mr-2" />
                              Send Message
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="project-request">
                      <form onSubmit={handleRequestSubmit} className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                          <p className="text-sm text-blue-700">
                            <strong>Request a Custom Project:</strong> Fill out this form to request a project to be built by our team. We'll review your request and get back to you.
                          </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Name *
                            </label>
                            <Input
                              name="name"
                              value={projectRequest.name}
                              onChange={handleRequestChange}
                              placeholder="Your full name"
                              required
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Email *
                            </label>
                            <Input
                              name="email"
                              type="email"
                              value={projectRequest.email}
                              onChange={handleRequestChange}
                              placeholder="your.email@example.com"
                              required
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Phone
                            </label>
                            <Input
                              name="phone"
                              value={projectRequest.phone}
                              onChange={handleRequestChange}
                              placeholder="+91 8432971897"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Branch *
                            </label>
                            <select
                              name="branch"
                              value={projectRequest.branch}
                              onChange={handleRequestChange}
                              className="w-full px-3 py-2 border rounded-md"
                              required
                            >
                              <option value="">Select Branch</option>
                              <option value="Computer Engineering">Computer Engineering</option>
                              <option value="Information Technology">IT</option>
                              <option value="Electronics & Telecommunication">ENTC</option>
                              <option value="Mechanical Engineering">Mechanical</option>
                              <option value="Electrical Engineering">Electrical</option>
                              <option value="Civil Engineering">Civil</option>
                              <option value="Automobile Engineering">Automobile</option>
                              <option value="Instrumentation Engineering">Instrumentation</option>
                              <option value="Artificial Intelligence & Machine Learning (AIML)">AIML</option>
                              <option value="Mechatronics Engineering">Mechatronics</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Semester *
                          </label>
                          <Input
                            name="semester"
                            type="number"
                            value={projectRequest.semester}
                            onChange={handleRequestChange}
                            placeholder="e.g., 3"
                            required
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Project Idea *
                          </label>
                          <Input
                            name="projectIdea"
                            value={projectRequest.projectIdea}
                            onChange={handleRequestChange}
                            placeholder="Brief project title/idea"
                            required
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Description *
                          </label>
                          <Textarea
                            name="description"
                            value={projectRequest.description}
                            onChange={handleRequestChange}
                            placeholder="Detailed description of your project requirements..."
                            rows={4}
                            required
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Required Tools/Technologies
                          </label>
                          <Input
                            name="requiredTools"
                            value={projectRequest.requiredTools}
                            onChange={handleRequestChange}
                            placeholder="e.g., React, Node.js, MongoDB"
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Deadline
                          </label>
                          <Input
                            name="deadline"
                            type="date"
                            value={projectRequest.deadline}
                            onChange={handleRequestChange}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Additional Notes
                          </label>
                          <Textarea
                            name="notes"
                            value={projectRequest.notes}
                            onChange={handleRequestChange}
                            placeholder="Any additional information or requirements..."
                            rows={3}
                            className="w-full"
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          disabled={isSubmittingRequest}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 text-lg font-semibold"
                        >
                          {isSubmittingRequest ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <FileText className="w-5 h-5 mr-2" />
                              Submit Project Request
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Get in Touch</h2>
              
              <div className="space-y-8">
                {/* Contact Details */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Contact Information</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-start">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                          <MapPin className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-1">Location</h4>
                          <p className="text-slate-600">Pune, Maharashtra, India</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                          <Mail className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-1">Email</h4>
                          <p className="text-slate-600">digidiploma06@gmail.com</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                          <Phone className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-1">Phone</h4>
                          <p className="text-slate-600">+91 8432971897</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Business Hours */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                      <Clock className="w-6 h-6 mr-2 text-blue-600" />
                      Business Hours
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Monday - Friday</span>
                        <span className="font-semibold text-slate-900">9:00 AM - 6:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Saturday</span>
                        <span className="font-semibold text-slate-900">10:00 AM - 4:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Sunday</span>
                        <span className="font-semibold text-slate-900">Closed</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> For urgent technical support, please email us directly or use our 24/7 support system.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Media */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                      <Globe className="w-6 h-6 mr-2 text-blue-600" />
                      Follow Us
                    </h3>
                    
                    <div className="flex space-x-4">
                      <a 
                        href="https://www.instagram.com/digi_diploma.in?igsh=eHM5MjZteHVmbjlv" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center hover:bg-pink-700 transition-colors"
                        aria-label="Instagram"
                        title="Follow us on Instagram"
                      >
                        <Instagram className="w-6 h-6 text-white" />
                      </a>
                      <a 
                        href="https://chat.whatsapp.com/BXyJ9ykaMnKKyHokiz2lII?mode=hqrt2" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors"
                        aria-label="WhatsApp"
                        title="Join our WhatsApp community"
                      >
                        <MessageCircle className="w-6 h-6 text-white" />
                      </a>
                      <a 
                        href="https://t.me/digidiploma" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                        aria-label="Telegram"
                        title="Join our Telegram channel"
                      >
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                      </a>
                      <a 
                        href="https://www.linkedin.com/in/chaitanya-zagade-766051294?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center hover:bg-blue-800 transition-colors"
                        aria-label="LinkedIn"
                        title="Connect on LinkedIn"
                      >
                        <Linkedin className="w-6 h-6 text-white" />
                      </a>
                      <a 
                        href="https://www.youtube.com/@DigiDiploma" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors"
                        aria-label="YouTube"
                        title="Subscribe to our YouTube channel"
                      >
                        <Youtube className="w-6 h-6 text-white" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
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
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-semibold text-slate-900">How do I register for DigiDiploma?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Registering for DigiDiploma is simple and free! Click the "Get Started" or "Login" button on our homepage, 
                    then select "Create Account". Fill in your details including your name, email, enrollment number, college, branch, and semester. 
                    The registration process takes only a few minutes, and once completed, you'll have immediate access to all features and study materials.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Is DigiDiploma completely free to use?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Yes! DigiDiploma is completely free for all students. We believe in making quality education accessible to everyone. 
                    All study materials including PDFs, PPTs, videos, handwritten notes, and project resources are available at no cost. 
                    There are no hidden fees, subscriptions, or premium tiers - everything is free forever.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Which engineering branches are supported?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    We support all major diploma engineering branches including Computer Engineering, Information Technology, 
                    Mechanical Engineering, Electrical Engineering, Civil Engineering, Electronics & Telecommunication (ENTC), 
                    Automobile Engineering, Instrumentation Engineering, Artificial Intelligence & Machine Learning (AIML), 
                    and Mechatronics Engineering. Each branch has dedicated resources organized by semester and subject.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Download className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Can I download materials for offline use?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Absolutely! You can download PDFs, PPTs, and other study materials directly to your device for offline access. 
                    This allows you to study anytime, anywhere, even without an internet connection. Simply click the download button 
                    on any material you want to save. All downloads are free and unlimited.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-5" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-slate-900">How can I upload study materials?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    Faculty members and administrators can upload study materials through the admin dashboard. 
                    Students can access these materials through their student dashboard, organized by branch, semester, and subject. 
                    If you're a faculty member and need access to the upload feature, please contact us to set up your admin account.
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
                    Yes! We have an active WhatsApp community where students can connect, share resources, discuss projects, 
                    and help each other. You can join our community through the "Join Community" button on the homepage. 
                    It's a great place to network, collaborate on projects, and get help from fellow students and faculty members.
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
                    and you have full control over your profile information. All data is stored securely and handled in accordance 
                    with privacy best practices.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="font-semibold text-slate-900">How can I get technical support?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-600">
                  <p className="leading-relaxed">
                    You can get technical support by emailing us at digidiploma06@gmail.com, calling us at +91 8432971897, 
                    or by filling out the contact form on this page. We typically respond within 24 hours during business days. 
                    For urgent issues, please call us directly. You can also join our WhatsApp community for peer support and quick answers.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-600 mb-4">Still have questions?</p>
            <Button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join thousands of students who have already discovered the power of digital education with DigiDiploma.
          </p>
          <Link to="/">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 text-lg font-semibold shadow-xl">
              <MessageCircle className="w-6 h-6 mr-3" />
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Contact;
