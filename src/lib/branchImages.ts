// Branch image mapping utility
// Using free stock images from Unsplash (free to use, no attribution required)

export const BRANCH_IMAGES: Record<string, string> = {
  // Computer Engineering - Code/Programming
  'Computer Engineering': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=400&fit=crop&auto=format&q=80',
  
  // Information Technology - Technology/Network
  'Information Technology': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop&auto=format&q=80',
  
  // Electronics & Telecommunication - Electronics/Circuit
  'Electronics & Telecommunication': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop&auto=format&q=80',
  'ENTC Engineering': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop&auto=format&q=80',
  
  // Mechanical Engineering - Machinery/Gears
  'Mechanical Engineering': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=400&fit=crop&auto=format&q=80',
  
  // Electrical Engineering - Electrical/Power
  'Electrical Engineering': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&h=400&fit=crop&auto=format&q=80',
  
  // Civil Engineering - Construction/Building
  'Civil Engineering': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=400&fit=crop&auto=format&q=80',
  
  // Automobile Engineering - Automotive/Car
  'Automobile Engineering': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=400&fit=crop&auto=format&q=80',
  
  // Instrumentation Engineering - Control Systems/Sensors
  'Instrumentation Engineering': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=400&fit=crop&auto=format&q=80',
  
  // AIML - AI/Data Science
  'Artificial Intelligence & Machine Learning (AIML)': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop&auto=format&q=80',
  
  // Mechatronics Engineering - Robotics/Automation
  'Mechatronics Engineering': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop&auto=format&q=80',
};

export const getBranchImage = (branchName: string | null | undefined): string => {
  if (!branchName) return '/placeholder.svg';
  return BRANCH_IMAGES[branchName] || '/placeholder.svg';
};

export const getBranchLogo = (branchName: string | null | undefined): string => {
  return getBranchImage(branchName);
};

