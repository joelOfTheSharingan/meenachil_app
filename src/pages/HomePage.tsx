import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { supabase } from '../lib/supabase.ts';

interface Profile {
  username: string;
  phone: string;
  role: 'admin' | 'supervisor';
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [reloaded, setReloaded] = useState(false); // ensures reload only once

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('username, phone, role')
          .eq('id', user.id)
          .maybeSingle(); // safer than single()

        if (fetchError) throw fetchError;

        if (!data) {
          setLoading(false);
          // Reload page **once** to ensure client-state sync
          if (!reloaded) {
            setReloaded(true);
            window.location.reload();
          }
          return;
        }

        setProfile(data as Profile);
        setUsername(data.username || '');
        setPhone(data.phone || '');

        // Redirect if profile is complete
        if (data.username && data.phone) {
          const destination = data.role === 'admin' ? '/admin' : '/supervisor';
          navigate(destination, { replace: true });
        }

      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate, reloaded]);

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
          { onConflict: 'id' } // safe upsert
        );

      if (upsertError) {
        setError(upsertError.message);
        return;
      }

      const savedProfile = upsertedData?.[0] as Profile | undefined;

      if (savedProfile) {
        setProfile(savedProfile);
        const destination = savedProfile.role === 'admin' ? '/admin' : '/supervisor';
        navigate(destination, { replace: true });
      } else {
        setError('Failed to save profile.');
      }

    } catch (err) {
      console.error('Unexpected error on profile submit:', err);
      setError('An unexpected error occurred');
    }
  };

  // Logout
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

  // Already complete profile → show main page content
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800">Welcome, {profile.username}</h1>
      <p className="mt-2 text-gray-600">Your phone: {profile.phone}</p>
      {/* Main dashboard content here */}
    </div>
  );
};

export default HomePage;
