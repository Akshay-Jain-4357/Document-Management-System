import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const DocumentContext = createContext(null);

export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchDocuments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/documents?page=${page}&limit=20`);
      setDocuments(res.data.documents);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocument = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/documents/${id}`);
      setCurrentDocument(res.data.document);
      setCurrentVersion(res.data.currentVersion);
      return res.data;
    } catch (err) {
      console.error('Failed to fetch document:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVersions = useCallback(async (docId, page = 1) => {
    try {
      const res = await api.get(`/documents/${docId}/versions?page=${page}&limit=20`);
      setVersions(res.data.versions);
      return res.data;
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  }, []);

  const selectVersion = useCallback(async (versionId) => {
    try {
      const res = await api.get(`/versions/${versionId}`);
      setCurrentVersion(res.data.version);
      return res.data.version;
    } catch (err) {
      console.error('Failed to fetch version:', err);
    }
  }, []);

  return (
    <DocumentContext.Provider
      value={{
        documents, currentDocument, currentVersion, versions, pagination, loading,
        fetchDocuments, fetchDocument, fetchVersions, selectVersion,
        setCurrentDocument, setCurrentVersion, setVersions,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error('useDocuments must be used within DocumentProvider');
  return ctx;
}
