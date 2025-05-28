
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import rehypeRaw from 'https://esm.sh/rehype-raw@7';
import remarkGfm from 'https://esm.sh/remark-gfm@4';
import { AVAILABLE_DOCS, DocFile } from './docsViewer.constants';
import Select from '../../components/common/Select';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useTheme } from '../../contexts/ThemeContext';

const DocsViewerPage: React.FC = () => {
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(AVAILABLE_DOCS.length > 0 ? AVAILABLE_DOCS[0] : null);
  const [docContent, setDocContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (selectedDoc) {
      setIsLoading(true);
      setError(null);
      fetch(selectedDoc.path)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load document: ${response.status} ${response.statusText}`);
          }
          return response.text();
        })
        .then(text => {
          setDocContent(text);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching document:", err);
          setError(err.message);
          setDocContent('');
          setIsLoading(false);
        });
    } else {
      setDocContent('');
    }
  }, [selectedDoc]);

  const handleDocChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const docPath = event.target.value;
    const findDoc = AVAILABLE_DOCS.find(d => d.path === docPath);
    setSelectedDoc(findDoc || null);
  };

  const docOptions = AVAILABLE_DOCS.map(doc => ({
    value: doc.path,
    label: doc.name,
  }));

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-textPrimary">Documentation Viewer</h1>

      {AVAILABLE_DOCS.length === 0 ? (
        <p className="text-textSecondary">No documents available.</p>
      ) : (
        <Select
          label="Select a document to view:"
          options={docOptions}
          value={selectedDoc?.path || ''}
          onChange={handleDocChange}
          containerClassName="mb-0"
        />
      )}

      {isLoading && <LoadingSpinner message="Loading document..." />}
      {error && <p className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900 p-3 rounded-md">Error: {error}</p>}
      
      {!isLoading && !error && docContent && selectedDoc && (
        <div className="bg-card p-4 rounded-lg shadow">
          {/* The h2 for document title is now part of the prose styling via Tailwind config for h1/h2 */}
          <article 
            className={`prose prose-sm sm:prose-base lg:prose-lg max-w-none 
                        ${theme === 'dark' ? 'prose-invert' : ''}`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {docContent}
            </ReactMarkdown>
          </article>
        </div>
      )}
      {!isLoading && !error && !docContent && selectedDoc && (
         <p className="text-textSecondary text-center py-6">Document content is empty or could not be loaded.</p>
      )}
       {!isLoading && !selectedDoc && AVAILABLE_DOCS.length > 0 && (
         <p className="text-textSecondary text-center py-6">Please select a document to view its content.</p>
      )}
    </div>
  );
};

export default DocsViewerPage;
