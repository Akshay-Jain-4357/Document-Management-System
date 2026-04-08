import { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';

export default function FileUpload({ onUpload, loading }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.txt') || dropped.name.endsWith('.pdf'))) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
    formData.append('message', message || `Uploaded ${file.name}`);
    onUpload(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-brand-400 bg-brand-500/10'
            : file
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-green-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="p-1 hover:bg-slate-700 rounded"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <p className="text-sm text-slate-300">Drop a <strong>.txt</strong> or <strong>.pdf</strong> file here</p>
            <p className="text-xs text-slate-500 mt-1">or click to browse</p>
          </>
        )}
      </div>

      <input
        type="text"
        placeholder="Document title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />

      <input
        type="text"
        placeholder="Commit message (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />

      <button
        type="submit"
        disabled={!file || loading}
        className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
      >
        {loading ? 'Uploading...' : 'Upload Document'}
      </button>
    </form>
  );
}
