import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function NotificationsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/documents/access-requests/pending');
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  useEffect(() => {
    // Initial fetch to get the count
    fetchRequests();
    
    // Polling interval could be added here
    const interval = setInterval(fetchRequests, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (requestId, action) => {
    setLoading(true);
    try {
      if (action === 'approve') {
        await api.post(`/documents/access-requests/${requestId}/approve`);
        toast.success('Access request approved');
      } else {
        await api.post(`/documents/access-requests/${requestId}/reject`);
        toast.success('Access request rejected');
      }
      // Remove from list
      setRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-all ${
          isOpen ? 'bg-gray-100 text-brand-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {requests.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping border-2 border-white absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500 border-2 border-white"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-modal z-50 animate-fade-in overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-brand-600" />
              Access Requests
            </h3>
            <span className="text-[11px] font-semibold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {requests.length} new
            </span>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {requests.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                You have no pending requests.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <div key={req._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold text-gray-900">{req.userId?.username}</span> requested <span className="font-medium text-brand-600">{req.requestedRole}</span> access to <span className="font-semibold">{req.documentId?.title}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        disabled={loading}
                        onClick={() => handleAction(req._id, 'approve')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        disabled={loading}
                        onClick={() => handleAction(req._id, 'reject')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-600 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
