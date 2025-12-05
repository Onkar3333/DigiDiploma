import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, 
  Upload, 
  FileText, 
  Download, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  X,
  File,
  Copy,
  CheckSquare,
  Square,
  Archive,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { ALL_BRANCHES } from '@/constants/branches';
import AdminMaterialManager from './AdminMaterialManager';

interface MobileAdminMaterialsProps {
  userBranch?: string;
}

const MobileAdminMaterials: React.FC<MobileAdminMaterialsProps> = ({ userBranch }) => {
  const { toast } = useToast();
  const [showFABMenu, setShowFABMenu] = useState(false);
  const [activeAction, setActiveAction] = useState<'add' | 'bulk' | 'import' | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 pb-24">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-slate-800">Material Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Admin Dashboard</p>
        </div>
      </div>

      {/* Main Content - Use existing AdminMaterialManager */}
      <div className="px-4 py-4">
        <AdminMaterialManager />
      </div>

      {/* Floating Action Button (FAB) Menu */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* FAB Menu Items */}
        {showFABMenu && (
          <div className="absolute bottom-16 right-0 mb-2 space-y-2 animate-in slide-in-from-bottom-4">
            <Button
              onClick={() => {
                setActiveAction('import');
                setShowFABMenu(false);
              }}
              className="h-12 px-4 shadow-lg rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            >
              <Copy className="w-5 h-5" />
              <span>Import Material</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveAction('bulk');
                setShowFABMenu(false);
              }}
              className="h-12 px-4 shadow-lg rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              <Archive className="w-5 h-5" />
              <span>Bulk Upload (ZIP)</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveAction('add');
                setShowFABMenu(false);
              }}
              className="h-12 px-4 shadow-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Material</span>
            </Button>
          </div>
        )}

        {/* Main FAB Button */}
        <Button
          onClick={() => setShowFABMenu(!showFABMenu)}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center"
        >
          {showFABMenu ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Bottom Navigation Bar (Alternative to FAB) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg md:hidden">
        <div className="grid grid-cols-3 h-16">
          <Button
            variant="ghost"
            onClick={() => setActiveAction('add')}
            className={`flex flex-col items-center justify-center gap-1 h-full rounded-none ${
              activeAction === 'add' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Add</span>
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setActiveAction('bulk')}
            className={`flex flex-col items-center justify-center gap-1 h-full rounded-none ${
              activeAction === 'bulk' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'
            }`}
          >
            <Archive className="w-5 h-5" />
            <span className="text-xs font-medium">Bulk</span>
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setActiveAction('import')}
            className={`flex flex-col items-center justify-center gap-1 h-full rounded-none ${
              activeAction === 'import' ? 'bg-purple-50 text-purple-600' : 'text-slate-600'
            }`}
          >
            <Copy className="w-5 h-5" />
            <span className="text-xs font-medium">Import</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileAdminMaterials;

