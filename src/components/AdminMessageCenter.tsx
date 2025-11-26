import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { authService } from '@/lib/auth';
import { toast } from 'sonner';
import { Eye, Loader2, Reply } from 'lucide-react';

type ReplyEntry = {
  subject: string;
  messageText: string;
  headerText: string;
  footerText: string;
  sentAt?: string;
  adminName?: string | null;
};

type ContactMessage = {
  id: string;
  type: 'contact';
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'replied';
  createdAt: string;
  viewedAt?: string | null;
  replyHistory?: ReplyEntry[];
};

type ProjectRequest = {
  id: string;
  type: 'project';
  name: string;
  email: string;
  phone?: string;
  branch?: string;
  semester?: string;
  projectIdea: string;
  description: string;
  requiredTools?: string;
  deadline?: string;
  notes?: string;
  status: 'new' | 'replied';
  workflowStatus?: string;
  createdAt: string;
  viewedAt?: string | null;
  replyHistory?: ReplyEntry[];
};

type MessageRecord = ContactMessage | ProjectRequest;

const defaultBody = `Thank you for connecting with DigiDiploma.

We have received your message and our team will get back to you shortly.

You can also follow us on our social media platforms for updates and resources:
• Instagram: https://www.instagram.com/digi_diploma.in?igsh=eHM5MjZteHVmbjlv
• LinkedIn: https://www.linkedin.com/in/chaitanya-zagade-766051294
• YouTube: https://www.youtube.com/@DigiDiploma

Regards,
Team DigiDiploma`;

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const AdminMessageCenter: React.FC = () => {
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [projectRequests, setProjectRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState({ contact: false, project: false });
  const [activeTab, setActiveTab] = useState<'contact' | 'project'>('contact');
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: 'contact' | 'project';
    record: MessageRecord | null;
  }>({ open: false, type: 'contact', record: null });
  const [replyForm, setReplyForm] = useState({
    subject: '',
    headerText: 'DigiDiploma Support',
    messageText: defaultBody,
    footerText: '© DigiDiploma. All rights reserved.'
  });
  const [sendingReply, setSendingReply] = useState(false);

  const fetchContactMessages = useCallback(async () => {
    setLoading((prev) => ({ ...prev, contact: true }));
    try {
      const res = await fetch('/api/contact/messages', {
        headers: { ...authService.getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Failed to load contact messages');
      const data = await res.json();
      setContactMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load contact messages');
      setContactMessages([]);
    } finally {
      setLoading((prev) => ({ ...prev, contact: false }));
    }
  }, []);

  const fetchProjectRequests = useCallback(async () => {
    setLoading((prev) => ({ ...prev, project: true }));
    try {
      const res = await fetch('/api/projects/requests/all', {
        headers: { ...authService.getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Failed to load project requests');
      const data = await res.json();
      setProjectRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load project requests');
      setProjectRequests([]);
    } finally {
      setLoading((prev) => ({ ...prev, project: false }));
    }
  }, []);

  useEffect(() => {
    fetchContactMessages();
    fetchProjectRequests();
  }, [fetchContactMessages, fetchProjectRequests]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: 'contact' | 'project' }>).detail;
      if (!detail?.type || detail.type === 'contact') fetchContactMessages();
      if (!detail?.type || detail.type === 'project') fetchProjectRequests();
    };
    window.addEventListener('messages:refresh', handler as EventListener);
    return () => window.removeEventListener('messages:refresh', handler as EventListener);
  }, [fetchContactMessages, fetchProjectRequests]);

  const markAsViewed = useCallback(
    async (record: MessageRecord) => {
      if (record.viewedAt) return;
      const endpoint =
        record.type === 'contact'
          ? `/api/contact/messages/${record.id}/view`
          : `/api/projects/requests/${record.id}/view`;
      try {
        await fetch(endpoint, {
          method: 'PATCH',
          headers: { ...authService.getAuthHeaders() }
        });
        if (record.type === 'contact') {
          setContactMessages((prev) =>
            prev.map((msg) => (msg.id === record.id ? { ...msg, viewedAt: new Date().toISOString() } : msg))
          );
        } else {
          setProjectRequests((prev) =>
            prev.map((req) => (req.id === record.id ? { ...req, viewedAt: new Date().toISOString() } : req))
          );
        }
      } catch (error) {
        console.error('Failed to mark as viewed', error);
      }
    },
    []
  );

  const handleOpenRecord = async (record: MessageRecord) => {
    setModalState({ open: true, type: record.type, record });
    setReplyForm({
      subject: `Re: ${record.type === 'contact' ? record.subject : record.projectIdea}`,
      headerText: 'DigiDiploma Support',
      messageText: defaultBody,
      footerText: '© DigiDiploma. All rights reserved.'
    });
    await markAsViewed(record);
  };

  const handleCloseModal = () => {
    setModalState({ open: false, type: 'contact', record: null });
    setReplyForm({
      subject: '',
      headerText: 'DigiDiploma Support',
      messageText: defaultBody,
      footerText: '© DigiDiploma. All rights reserved.'
    });
    setSendingReply(false);
  };

  const handleSendReply = async () => {
    if (!modalState.record) return;
    const { record, type } = modalState;
    setSendingReply(true);
    try {
      const endpoint =
        type === 'contact'
          ? `/api/contact/messages/${record.id}/reply`
          : `/api/projects/requests/${record.id}/reply`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
        body: JSON.stringify({
          replySubject: replyForm.subject,
          headerText: replyForm.headerText,
          messageText: replyForm.messageText,
          footerText: replyForm.footerText
        })
      });
      if (!res.ok) throw new Error('Failed to send reply');
      toast.success('Reply sent successfully');
      handleCloseModal();
      if (type === 'contact') {
        fetchContactMessages();
      } else {
        fetchProjectRequests();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const statusBadge = (status: 'new' | 'replied') =>
    status === 'replied'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold">Inbox</CardTitle>
              <p className="text-sm text-slate-500">Manage contact messages and project requests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={fetchContactMessages}>
                Refresh Contacts
              </Button>
              <Button variant="outline" size="sm" onClick={fetchProjectRequests}>
                Refresh Requests
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'contact' | 'project')}>
            <TabsList>
              <TabsTrigger value="contact">
                Contact Messages ({contactMessages.filter((m) => m.status === 'new').length} new)
              </TabsTrigger>
              <TabsTrigger value="project">
                Project Requests ({projectRequests.filter((r) => r.status === 'new').length} new)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="mt-6">
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Subject</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Created</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading.contact ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                          Loading contact messages...
                        </td>
                      </tr>
                    ) : contactMessages.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                          No contact messages found
                        </td>
                      </tr>
                    ) : (
                      contactMessages.map((message) => (
                        <tr key={message.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              {message.name}
                              {!message.viewedAt && (
                                <Badge variant="outline" className="text-amber-600 border-amber-200">
                                  New
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{message.email}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{message.subject}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{message.message}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(message.status)}`}>
                              {message.status === 'replied' ? 'Replied' : 'New'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatDateTime(message.createdAt)}</td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenRecord(message)}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="project" className="mt-6">
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Workflow</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Created</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading.project ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                          Loading project requests...
                        </td>
                      </tr>
                    ) : projectRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                          No project requests found
                        </td>
                      </tr>
                    ) : (
                      projectRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              {request.name}
                              {!request.viewedAt && (
                                <Badge variant="outline" className="text-amber-600 border-amber-200">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              {request.branch || '—'} • Sem {request.semester || '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{request.email}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{request.projectIdea}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{request.description}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="capitalize">
                              {request.workflowStatus || 'pending'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(request.status)}`}>
                              {request.status === 'replied' ? 'Replied' : 'New'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatDateTime(request.createdAt)}</td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenRecord(request)}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={modalState.open} onOpenChange={(open) => (!open ? handleCloseModal() : null)}>
        <DialogContent className="max-w-3xl">
          {modalState.record && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {modalState.record.type === 'contact' ? modalState.record.subject : modalState.record.projectIdea}
                </DialogTitle>
                <DialogDescription>
                  {modalState.record.name} • {modalState.record.email} •{' '}
                  {formatDateTime(modalState.record.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6 py-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    {modalState.record.type === 'contact' ? (
                      <>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{modalState.record.message}</p>
                      </>
                    ) : (
                      <div className="space-y-2 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Description</p>
                        <p>{modalState.record.description}</p>
                        {modalState.record.requiredTools && (
                          <p className="text-slate-600">
                            <span className="font-semibold">Tools:</span> {modalState.record.requiredTools}
                          </p>
                        )}
                        {modalState.record.deadline && (
                          <p className="text-slate-600">
                            <span className="font-semibold">Deadline:</span> {modalState.record.deadline}
                          </p>
                        )}
                        {modalState.record.notes && (
                          <p className="text-slate-600">
                            <span className="font-semibold">Notes:</span> {modalState.record.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-900">Reply</p>
                    <Input
                      value={replyForm.subject}
                      onChange={(e) => setReplyForm((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Reply subject"
                    />
                    <Input
                      value={replyForm.headerText}
                      onChange={(e) => setReplyForm((prev) => ({ ...prev, headerText: e.target.value }))}
                      placeholder="Header text"
                    />
                    <Textarea
                      rows={6}
                      value={replyForm.messageText}
                      onChange={(e) => setReplyForm((prev) => ({ ...prev, messageText: e.target.value }))}
                      placeholder="Message body"
                    />
                    <Input
                      value={replyForm.footerText}
                      onChange={(e) => setReplyForm((prev) => ({ ...prev, footerText: e.target.value }))}
                      placeholder="Footer text"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSendReply} disabled={sendingReply || !replyForm.subject || !replyForm.messageText}>
                        {sendingReply ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Reply className="w-4 h-4 mr-2" />
                            Send Reply
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleCloseModal}>
                        Cancel
                      </Button>
                    </div>
                  </div>

                  {!!modalState.record.replyHistory?.length && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <p className="text-sm font-semibold text-slate-900">Previous Replies</p>
                      <div className="space-y-3">
                        {modalState.record.replyHistory?.map((entry, index) => (
                          <div key={`${entry.sentAt}-${index}`} className="rounded-lg border border-slate-100 p-3">
                            <p className="text-xs text-slate-500">
                              {formatDateTime(entry.sentAt)} • {entry.adminName || 'Admin'}
                            </p>
                            <p className="font-semibold text-slate-800">{entry.subject}</p>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{entry.messageText}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMessageCenter;
