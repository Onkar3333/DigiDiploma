import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin,
  GraduationCap,
  Edit,
  Save,
  X,
  ArrowLeft,
  Camera,
  Shield,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { getBranchLogo } from '@/lib/branchImages';

const Profile = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    bio: '',
    branch: '',
    semester: ''
  });

  useEffect(() => {
    fetchProfile();
  }, [authUser?.id]);

  const fetchProfile = async () => {
    if (!authUser?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/users/profile', {
        headers: authService.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setEditForm({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          bio: data.bio || '',
          branch: data.branch || '',
          semester: data.semester || ''
        });
      } else {
        toast({ title: "Failed to load profile", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({ title: "Failed to load profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image size must be less than 2MB", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      // Compress image before converting to base64
      const compressImage = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              // Calculate new dimensions
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }

              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
              }

              ctx.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
              resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      // Compress and convert to base64
      const base64 = await compressImage(file, 400, 0.8);
      
      try {
        const response = await fetch('/api/users/profile/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders()
          },
          body: JSON.stringify({ avatar: base64 })
        });

        if (response.ok) {
          const data = await response.json();
          setUserData({ ...userData, avatar: data.avatar });
          toast({ title: "Profile picture updated successfully" });
        } else {
          const error = await response.json();
          toast({ 
            title: "Failed to update profile picture", 
            description: error.error || error.details || "Please try again",
            variant: "destructive" 
          });
        }
      } catch (error) {
        console.error('Error uploading avatar:', error);
        toast({ title: "Failed to update profile picture", variant: "destructive" });
      } finally {
        setUploadingAvatar(false);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast({ title: "Failed to read image file", variant: "destructive" });
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare data - send all fields that are being edited
      const updateData: any = {};
      
      // Always include name if it exists
      if (editForm.name !== undefined) {
        updateData.name = editForm.name.trim() || userData?.name || '';
      }
      
      // Include optional fields
      if (editForm.phone !== undefined) {
        updateData.phone = editForm.phone?.trim() || '';
      }
      if (editForm.address !== undefined) {
        updateData.address = editForm.address?.trim() || '';
      }
      if (editForm.bio !== undefined) {
        updateData.bio = editForm.bio?.trim() || '';
      }
      if (editForm.branch !== undefined && editForm.branch !== '') {
        updateData.branch = editForm.branch.trim();
      }
      if (editForm.semester !== undefined && editForm.semester !== '') {
        const semNum = parseInt(editForm.semester.toString(), 10);
        updateData.semester = isNaN(semNum) ? null : semNum;
      }

      console.log('Sending update data:', updateData);

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify(updateData)
      });

      const responseData = await response.json().catch(() => ({ error: 'Failed to parse response' }));

      if (response.ok) {
        setUserData(responseData.user);
        setIsEditing(false);
        toast({ title: "Profile updated successfully" });
      } else {
        console.error('Profile update error:', responseData);
        toast({ 
          title: responseData.error || "Failed to update profile", 
          description: responseData.details || responseData.message || '',
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({ 
        title: "Failed to update profile", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (userData) {
      setEditForm({
        name: userData.name || '',
        phone: userData.phone || '',
        address: userData.address || '',
        bio: userData.bio || '',
        branch: userData.branch || '',
        semester: userData.semester || ''
      });
    }
    setIsEditing(false);
  };

  const handleBack = () => {
    if (userData?.userType === 'admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/student-dashboard');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const displayUser = userData || authUser;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-primary-foreground">
                    My Profile
                  </h1>
                  <p className="text-primary-foreground/90 text-sm lg:text-base">
                    Manage your account and preferences
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground/20"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 border-0 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader className="text-center pb-4">
                <div className="relative inline-block">
                  <Avatar className="w-32 h-32 mx-auto mb-4 ring-4 ring-primary/20">
                    <AvatarImage src={displayUser?.avatar || undefined} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/80 text-white">
                      {displayUser?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-full p-0"
                    variant="secondary"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <CardTitle className="text-2xl">{displayUser?.name}</CardTitle>
                <p className="text-muted-foreground">{displayUser?.email}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge className="bg-primary/10 text-primary">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    {displayUser?.userType === 'admin' ? 'Administrator' : 'Student'}
                  </Badge>
                  <Badge variant="outline">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {displayUser?.createdAt && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Member since</p>
                    <p className="font-semibold">{formatDate(displayUser.createdAt)}</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Current Status</p>
                  <Badge className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={saving}
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm font-medium">{displayUser?.name || 'N/A'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {displayUser?.email || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {displayUser?.phone || 'Not provided'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Enrollment Number</Label>
                    <p className="text-sm font-medium">{displayUser?.studentId || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Enrollment number cannot be changed</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  {isEditing ? (
                    <Input
                      id="address"
                      value={editForm.address}
                      onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                      placeholder="Enter your address"
                    />
                  ) : (
                    <p className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {displayUser?.address || 'Not provided'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  {isEditing ? (
                    <textarea
                      id="bio"
                      className="w-full p-3 border rounded-md resize-none"
                      rows={3}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {displayUser?.bio || 'No bio provided'}
                    </p>
                  )}
                </div>
                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} size="sm" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} size="sm" disabled={saving}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg relative overflow-hidden">
                    <div className="relative z-10">
                      {displayUser?.branch && !isEditing && (
                        <div className="mb-3 flex justify-center">
                          <img 
                            src={getBranchLogo(displayUser.branch)} 
                            alt={`${displayUser.branch} logo`}
                            className="w-16 h-16 object-cover rounded-lg bg-white/80 p-2 shadow-md border-2 border-blue-200"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      {!displayUser?.branch && !isEditing && (
                        <GraduationCap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      )}
                      <p className="text-sm text-muted-foreground">Branch</p>
                      {isEditing ? (
                        <Input
                          value={editForm.branch}
                          onChange={(e) => setEditForm({...editForm, branch: e.target.value})}
                          className="mt-2"
                          placeholder="Enter branch"
                        />
                      ) : (
                        <p className="font-semibold">{displayUser?.branch || 'Not set'}</p>
                      )}
                    </div>
                    {displayUser?.branch && !isEditing && (
                      <div className="absolute inset-0 opacity-10">
                        <img 
                          src={getBranchLogo(displayUser.branch)} 
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg">
                    <GraduationCap className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Semester</p>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="1"
                        max="8"
                        value={editForm.semester}
                        onChange={(e) => setEditForm({...editForm, semester: e.target.value})}
                        className="mt-2"
                        placeholder="Enter semester"
                      />
                    ) : (
                      <p className="font-semibold">{displayUser?.semester || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
