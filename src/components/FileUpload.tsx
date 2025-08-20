import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { parseCSV, analyzeColumns, generateDataSummary, generateAIInsights } from '../utils/dataProcessor';
import * as XLSX from 'xlsx';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FileUpload: React.FC = () => {
  const { setDataset, setDataSummary, setAIInsights, setIsLoading } = useDataContext();
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [datasetPreview, setDatasetPreview] = useState<any[]>([]);

  const handleFile = async (file: File) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File is too large. Max size 10MB.');
      setUploadStatus('error');
      return;
    }
    if (!['csv', 'json', 'xlsx', 'xls'].some(ext => file.name.endsWith(ext))) {
      setErrorMessage('Unsupported file format.');
      setUploadStatus('error');
      return;
    }

    setIsLoading(true);
    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      let data: Record<string, any>[] = [];

      if (file.name.endsWith('.csv')) data = await parseCSV(file);
      else if (file.name.endsWith('.json')) {
        const text = await file.text();
        data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('JSON must be an array of objects');
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      }

      if (!data || data.length === 0) throw new Error('No data found in file');

      const columns = analyzeColumns(data);
      const summary = generateDataSummary(data);
      const insights = generateAIInsights(data, columns);

      const dataset = {
        id: `dataset-${Date.now()}`,
        name: file.name,
        data,
        columns,
        uploadedAt: new Date(),
        size: file.size,
      };

      setDataset(dataset);
      setDataSummary(summary);
      setAIInsights(insights);
      setDatasetPreview(data.slice(0, 5)); // Preview first 5 rows
      setUploadStatus('success');
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process file');
      setUploadStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  };

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
      {/* Floating Logo */}
      <motion.div
        className="absolute text-white opacity-10 select-none pointer-events-none font-bold text-[15rem]"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        style={{ top: '-20%', left: '-10%' }}
      >
        NIKA
      </motion.div>

      <motion.div className="w-full max-w-3xl relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            Welcome to NIKA
          </h1>
          <p className="text-gray-400 text-lg">Upload your dataset to begin advanced analytics</p>
        </div>

        {/* Upload Card */}
        <motion.div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 backdrop-blur-md bg-black/50
            ${dragActive ? 'border-blue-400 bg-blue-500/10' : uploadStatus === 'success' ? 'border-green-400 bg-green-500/10' : uploadStatus === 'error' ? 'border-red-400 bg-red-500/10' : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          whileHover={{ scale: 1.02 }}
        >
          <input type="file" accept=".csv,.json,.xlsx,.xls" onChange={handleChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploadStatus === 'uploading'} />

          <AnimatePresence mode="wait">
            {uploadStatus === 'uploading' && (
              <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-blue-400">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="mx-auto mb-4">
                  <Upload className="h-14 w-14" />
                </motion.div>
                <p className="text-lg font-medium">Processing your data...</p>
              </motion.div>
            )}

            {uploadStatus === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-green-400">
                <CheckCircle className="h-14 w-14 mx-auto mb-4" />
                <p className="text-lg font-medium">Dataset uploaded successfully!</p>

                {/* Preview Table */}
                {datasetPreview.length > 0 && (
                  <div className="mt-4 text-left bg-gray-900 p-4 rounded-md max-h-64 overflow-auto">
                    <h3 className="text-white font-semibold mb-2">Preview:</h3>
                    <table className="w-full text-sm text-gray-300 border-collapse">
                      <thead>
                        <tr>
                          {Object.keys(datasetPreview[0]).map((col) => (
                            <th key={col} className="border-b border-gray-700 px-2 py-1">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {datasetPreview.map((row, idx) => (
                          <tr key={idx}>
                            {Object.keys(row).map((col) => (
                              <td key={col} className="border-b border-gray-800 px-2 py-1">{row[col]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {uploadStatus === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-red-400">
                <AlertCircle className="h-14 w-14 mx-auto mb-4" />
                <p className="text-lg font-medium">Upload failed</p>
                <p className="text-sm text-gray-300 mt-2">{errorMessage}</p>
              </motion.div>
            )}

            {uploadStatus === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gray-400">
                <FileText className="h-14 w-14 mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-2">Drop your dataset here</p>
                <p className="text-sm mb-4">or click to browse files</p>
                <div className="flex justify-center space-x-4 text-xs">
                  <span className="bg-gray-700 px-2 py-1 rounded">CSV</span>
                  <span className="bg-gray-700 px-2 py-1 rounded">JSON</span>
                  <span className="bg-gray-700 px-2 py-1 rounded">Excel</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Supported formats: CSV, JSON, Excel • Max file size: 10MB</p>
        </div>
      </motion.div>
    </div>
  );
};

export default FileUpload;
