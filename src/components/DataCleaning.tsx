import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RectangleVertical as CleaningServices,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Edit3,
  Info
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { useDataContext } from '../context/DataContext';

const DataCleaning: React.FC = () => {
  const { dataset, setDataset, dataSummary, setDataSummary } = useDataContext();
  const [cleaningLog, setCleaningLog] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>(dataset?.data.slice(0, 5) || []);
  const [history, setHistory] = useState<any[]>([dataset?.data || []]);
  const [historyIndex, setHistoryIndex] = useState(0);

  if (!dataset || !dataSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No data available for cleaning</p>
      </div>
    );
  }

  // ---------- Helper Functions ----------
  const pushHistory = (newData: any[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevData = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      recalcSummary(prevData);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextData = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      recalcSummary(nextData);
    }
  };

  const excelDateToJSDate = (serial: number) => {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial);
    let totalSeconds = Math.floor(86400 * fractional_day);
    const seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
  };

  const detectColumnTypes = (data: any[], columns: any[]) => {
    const dateKeywords = ['date', 'dob', 'joining', 'created', 'updated'];
    const isValidDateString = (val: string) => {
      const ddmmyyyy = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/;
      const yyyymmdd = /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/;
      const textDate = /^(?:\d{1,2}(?:st|nd|rd|th)?\s)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[, ]+\d{4}$|^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2},\s\d{4}$/i;
      return ddmmyyyy.test(val) || yyyymmdd.test(val) || textDate.test(val) || !isNaN(Date.parse(val));
    };

    return columns.map(col => {
      const sample = data.find(row => row[col.name] != null)?.[col.name];
      let type: string = 'Text';
      if (sample != null) {
        const colNameLower = col.name.toLowerCase();
        const isDateColumnName = dateKeywords.some(keyword => colNameLower.includes(keyword));
        if (typeof sample === 'number') {
          if ((sample > 29500 && sample < 50000) || isDateColumnName) type = 'Date';
          else type = 'Numeric';
        } else if (typeof sample === 'string') {
          if (isValidDateString(sample) || isDateColumnName) type = 'Date';
          else if (!isNaN(Number(sample))) type = 'Numeric';
          else type = 'Text';
        } else if (sample instanceof Date) {
          type = 'Date';
        }
      }
      return { ...col, type };
    });
  };

  const enforceColumnTypes = (data: any[], columns: any[]) => {
    return data.map(row => {
      const newRow: any = {};
      columns.forEach(col => {
        const val = row[col.name];
        if (col.type === 'Numeric') {
          newRow[col.name] = typeof val === 'number' ? val : parseFloat(val) || 0;
        } else if (col.type === 'Date') {
          if (val instanceof Date) newRow[col.name] = val;
          else if (typeof val === 'number') newRow[col.name] = excelDateToJSDate(val);
          else newRow[col.name] = new Date(val);
        } else {
          newRow[col.name] = val != null ? val.toString() : 'Unknown';
        }
      });
      return newRow;
    });
  };

  const recalcSummary = (updatedData: typeof dataset.data, updatedColumns?: any) => {
    const columns = updatedColumns || dataset.columns;
    const missingValues = updatedData.reduce((acc, row) => {
      Object.values(row).forEach(val => { if (val === null || val === undefined || val === '') acc++; });
      return acc;
    }, 0);
    const duplicates = updatedData.length - new Set(updatedData.map(JSON.stringify)).size;
    setDataSummary({ totalRows: updatedData.length, totalColumns: columns.length, missingValues, duplicates });
    setDataset({ ...dataset, data: updatedData, columns });
    setPreviewData(updatedData.slice(0, 5));
  };

  // ---------- Cleaning Handlers ----------
  const handleRemoveDuplicates = () => {
    const beforeCount = dataset.data.length;
    const updatedData = Array.from(new Set(dataset.data.map(JSON.stringify))).map(JSON.parse);
    const removed = beforeCount - updatedData.length;
    const desc = removed > 0 ? `Removed ${removed} duplicate records` : 'No duplicates found';
    setCleaningLog(prev => [desc, ...prev]);
    const typedData = enforceColumnTypes(updatedData, dataset.columns);
    recalcSummary(typedData);
    pushHistory(typedData);
  };

  const handleHandleMissing = () => {
    const updatedData = dataset.data.map(row => {
      const newRow = { ...row };
      dataset.columns.forEach(col => {
        if (newRow[col.name] === null || newRow[col.name] === undefined || newRow[col.name] === '') {
          if (col.type === 'Numeric') newRow[col.name] = 0;
          else if (col.type === 'Date') newRow[col.name] = new Date();
          else if (col.type === 'Text') newRow[col.name] = 'Unknown';
        }
      });
      return newRow;
    });
    setCleaningLog(prev => ['Handled missing values', ...prev]);
    const typedData = enforceColumnTypes(updatedData, dataset.columns);
    recalcSummary(typedData);
    pushHistory(typedData);
  };

  const handleFixTypes = () => {
    const updatedColumns = detectColumnTypes(dataset.data, dataset.columns);
    const typedData = enforceColumnTypes(dataset.data, updatedColumns);
    setCleaningLog(prev => ['Fixed column types', ...prev]);
    recalcSummary(typedData, updatedColumns);
    pushHistory(typedData);
  };

  // ---------- Format Date ----------
  const formatDate = (date: Date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const downloadCSV = () => {
    const rows = [dataset.columns.map(c => c.name).join(',')];
    dataset.data.forEach(row => {
      const rowData = dataset.columns.map(c => {
        const val = row[c.name];
        if (c.type === 'Date' && val instanceof Date) return `"${formatDate(val)}"`;
        return `"${val}"`;
      });
      rows.push(rowData.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'cleaned_data.csv');
  };

  // ---------- Severity Helpers ----------
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-500/10 text-red-400';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case 'low': return 'border-green-500 bg-green-500/10 text-green-400';
      default: return 'border-gray-500 bg-gray-500/10 text-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return AlertTriangle;
      case 'medium': return Info;
      case 'low': return CheckCircle;
      default: return Info;
    }
  };

  const dataIssues = [
    {
      id: 'missing-values',
      title: 'Missing Values',
      count: dataSummary.missingValues,
      severity: dataSummary.missingValues > dataset.data.length * 0.1 ? 'high' : 'medium',
      handler: handleHandleMissing,
      action: 'Handle Missing'
    },
    {
      id: 'duplicates',
      title: 'Duplicate Records',
      count: dataSummary.duplicates,
      severity: dataSummary.duplicates > 0 ? 'medium' : 'low',
      handler: handleRemoveDuplicates,
      action: 'Remove Duplicates'
    },
    {
      id: 'data-types',
      title: 'Data Type Issues',
      count: dataset.columns.filter(col => col.type === 'Text' || col.type === 'Numeric' || col.type === 'Date').length,
      severity: 'low',
      handler: handleFixTypes,
      action: 'Fix Types'
    }
  ];

  // ---------- Render ----------
  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-3">
          <CleaningServices className="h-8 w-8 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Data Cleaning & Transformation</h2>
            <p className="text-gray-400">Identify and fix data quality issues with separate actions</p>
          </div>
        </div>
      </motion.div>

      {/* Data Issue Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {dataIssues.map((issue, index) => {
          const Icon = getSeverityIcon(issue.severity);
          const colorClass = getSeverityColor(issue.severity);
          return (
            <motion.div key={issue.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`rounded-lg p-6 border ${colorClass} hover:scale-105 transition-all duration-200`}>

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Icon className="h-6 w-6" />
                  <h3 className="text-lg font-semibold text-white">{issue.title}</h3>
                </div>
                <span className="text-2xl font-bold">{issue.count}</span>
              </div>
              <button onClick={issue.handler} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2" >
                <Edit3 className="h-4 w-4" />
                <span>{issue.action}</span>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Actions */}
      <div className="flex space-x-2 mt-4">
        <button onClick={undo} className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 text-white">Undo</button>
        <button onClick={redo} className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 text-white">Redo</button>
        <button onClick={downloadCSV} className="bg-green-600 px-3 py-1 rounded hover:bg-green-500 text-white">Download Cleaned Data</button>
      </div>

      {/* Preview Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">Data Preview (Top 5 Rows)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                {dataset.columns.map(col => (
                  <th key={col.name} className="text-left p-3 text-gray-300 font-medium">
                    {col.name}
                    <span className="block text-xs text-gray-500 font-normal">{col.type}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, index) => (
                <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/20">
                  {dataset.columns.map(col => (
                    <td key={col.name} className="p-3 text-gray-300">
                      {col.type === 'Date' && row[col.name] instanceof Date
                        ? formatDate(row[col.name])
                        : row[col.name]?.toString() || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Cleaning Log */}
      {cleaningLog.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 text-green-400" />
              Cleaning History
            </h3>
            <button onClick={() => setCleaningLog([])} className="text-red-400 hover:text-red-300 text-sm flex items-center space-x-1" >
              <Trash2 className="h-4 w-4" /> <span>Clear Log</span>
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cleaningLog.map((log, index) => (
              <div key={index} className="bg-gray-700/30 rounded p-3 text-sm text-gray-300 font-mono">{log}</div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default DataCleaning;
