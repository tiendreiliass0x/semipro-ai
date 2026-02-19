import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { ProjectStudio } from '@/sections/ProjectStudio';
import { PublicLanding } from '@/sections/PublicLanding';
import { Footer } from '@/sections/Footer';
import './App.css';

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#010101] text-white">
      <div className="grain-overlay" />
      <AuthModal />
      <main>
        {isAuthenticated ? <ProjectStudio /> : <PublicLanding />}
        <Footer />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
