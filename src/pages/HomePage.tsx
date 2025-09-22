import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { supabase } from '../lib/supabase.ts';

interface Profile {
  username: string;
  phone: string;
  role?: 'admin' | 'supervisor';
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [redirected, setRedirected] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || redirected) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('username, phone, role')
          .eq('id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (data && data.username && data.phone) {
          // Profile complete → redirect based on role
          setRedirected(true);
          const destination = data.role === 'admin' ? '/admin' : '/supervisor';
          navigate(destination, { replace: true });
        } else {
          setUsername(data?.username || '');
          setPhone(data?.phone || '');
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate, redirected]);

  // Submit profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user?.id || !user?.email) {
      setError('User not found');
      return;
    }

    if (!username || !phone) {
      setError('Please fill in both fields.');
      return;
    }

    try {
      const { data: upsertedData, error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            id: user.id,
            email: user.email,
            username,
            phone,
            role: 'supervisor', // default for new users
          },
          { onConflict: 'id', returning: 'representation' }
        );

      if (upsertError) {
        setError(upsertError.message);
        return;
      }

      // Immediately update local profile state
      const savedProfile = upsertedData?.[0];
      setProfile(savedProfile);

      // Redirect based on role
      const destination = savedProfile?.role === 'admin' ? '/admin' : '/supervisor';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Unexpected error on profile submit:', err);
      setError('An unexpected error occurred');
    }
  };

  // Manual logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Failed to log out');
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  // Show profile form if incomplete
  if (!profile || !profile.username || !profile.phone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
          <h1 className="text-xl font-bold mb-4">Complete Your Profile</h1>
          {error && <p className="text-red-600 mb-2">{error}</p>}
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border rounded p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded p-2"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Save & Continue
            </button>
          </form>
          <button
            onClick={handleLogout}
            className="mt-4 w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Fallback (should rarely appear)
  return <p>Redirecting...</p>;
};

export default HomePage;
