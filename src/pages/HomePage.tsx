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
        const { data, error } = await supabase
          .from('users')
          .select('username, phone, role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error.message);
          setError('Failed to fetch profile');
          setLoading(false);
          return;
        }

        setProfile(data);
        if (!data.username || !data.phone) {
          // Incomplete profile
          setUsername(data.username || '');
          setPhone(data.phone || '');
        } else {
          // Complete profile → redirect based on role
          setRedirected(true);
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
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Complete Your Profile
          </h2>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
            >
              Save & Continue
            </button>
          </form>
          <button
            onClick={handleLogout}
            className="w-full mt-4 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition duration-200"
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
