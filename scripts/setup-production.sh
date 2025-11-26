#!/bin/bash

# DigiDiploma Production Setup Script
# This script sets up the production environment for DigiDiploma

set -e

echo "🚀 DigiDiploma Production Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI is not installed. Installing..."
        npm install -g firebase-tools
    fi
    
    print_success "All dependencies are installed"
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        print_warning "Creating .env file from template..."
        cp .env.example .env
        print_warning "Please update .env file with your actual values"
    else
        print_success ".env file already exists"
    fi
    
    if [ ! -f backend/.env ]; then
        print_warning "Creating backend/.env file from template..."
        cp backend/.env.example backend/.env
        print_warning "Please update backend/.env file with your actual values"
    else
        print_success "backend/.env file already exists"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    npm install
    
    print_status "Installing backend dependencies..."
    cd backend && npm install && cd ..
    
    print_success "All dependencies installed"
}

# Setup Firebase
setup_firebase() {
    print_status "Setting up Firebase..."
    
    if [ ! -f firebase.json ]; then
        print_error "firebase.json not found. Please run 'firebase init' first."
        exit 1
    fi
    
    print_status "Deploying Firestore rules..."
    firebase deploy --only firestore:rules
    
    print_status "Deploying Storage rules..."
    firebase deploy --only storage
    
    print_success "Firebase setup completed"
}

# Build application
build_application() {
    print_status "Building application for production..."
    
    # Build frontend
    npm run build:prod
    
    print_success "Application built successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Frontend tests
    npm run test -- --coverage --watchAll=false
    
    # Backend tests
    cd backend && npm test && cd ..
    
    print_success "All tests passed"
}

# Deploy to Firebase
deploy_firebase() {
    print_status "Deploying to Firebase..."
    
    # Deploy hosting
    firebase deploy --only hosting
    
    print_success "Deployment completed"
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    # Create monitoring configuration
    cat > monitoring.json << EOF
{
  "uptime": {
    "endpoints": [
      "https://your-domain.com",
      "https://your-domain.com/api/health"
    ],
    "interval": 300
  },
  "alerts": {
    "email": "admin@your-domain.com",
    "webhook": "https://hooks.slack.com/your-webhook"
  }
}
EOF
    
    print_success "Monitoring configuration created"
}

# Create backup script
create_backup_script() {
    print_status "Creating backup script..."
    
    cat > scripts/backup.sh << 'EOF'
#!/bin/bash

# DigiDiploma Backup Script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$DATE"

mkdir -p $BACKUP_DIR

# Backup Firestore
firebase firestore:export $BACKUP_DIR/firestore

# Backup Storage
gsutil -m cp -r gs://your-bucket-name $BACKUP_DIR/storage

echo "Backup completed: $BACKUP_DIR"
EOF
    
    chmod +x scripts/backup.sh
    print_success "Backup script created"
}

# Main setup function
main() {
    echo "Starting DigiDiploma production setup..."
    
    check_dependencies
    setup_environment
    install_dependencies
    setup_firebase
    build_application
    run_tests
    deploy_firebase
    setup_monitoring
    create_backup_script
    
    echo ""
    print_success "🎉 DigiDiploma production setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Update environment variables in .env files"
    echo "2. Configure your domain name"
    echo "3. Set up SSL certificates"
    echo "4. Configure monitoring alerts"
    echo "5. Test all functionality"
    echo ""
    echo "For more information, see DEPLOYMENT.md"
}

# Run main function
main "$@"
