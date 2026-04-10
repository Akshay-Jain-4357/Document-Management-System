import { useState, useEffect } from 'react';
import { useDocuments } from '../context/DocumentContext';
import Navbar from '../components/Navbar';
import DocumentCard from '../components/DocumentCard';
import { Search, Globe, Filter } from 'lucide-react';

export default function ExplorePage() {
  const { publicDocuments, loading, fetchPublicDocuments } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' or 'contributors'

  useEffect(() => {
    fetchPublicDocuments();
  }, [fetchPublicDocuments]);

  const filteredDocs = (publicDocuments || []).filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedDocs = [...filteredDocs].sort((a, b) => {
    if (sortBy === 'contributors') {
      return (b.contributorsCount || 0) - (a.contributorsCount || 0);
    }
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-brand-600" />
            Explore
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Discover public documents created by the community.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search public documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all shadow-card"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-300 rounded-xl text-gray-700 text-sm px-3 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 shadow-card"
            >
              <option value="recent">Most Recent</option>
              <option value="contributors">Most Contributors</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-brand-200 border-t-brand-600 rounded-full" />
          </div>
        ) : sortedDocs.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-card">
            <Globe className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              No public documents available
            </h3>
            <p className="text-sm text-gray-400">
              {searchQuery ? 'Try matching a different search term.' : 'There are no public documents visible in the system.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} isExplore={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
