import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  Users,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPieChart, Pie, Cell, Legend 
} from 'recharts';

const Overview: React.FC = () => {
  const { dataset, dataSummary } = useDataContext();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (!dataset || !dataSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  const summaryCards = [
    { title: 'Total Rows', value: dataSummary.totalRows.toLocaleString(), icon: Database, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { title: 'Total Columns', value: dataSummary.totalColumns.toString(), icon: BarChart3, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    { title: 'Missing Values', value: dataSummary.missingValues.toLocaleString(), icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    { title: 'Duplicates', value: dataSummary.duplicates.toString(), icon: Users, color: 'text-red-400', bgColor: 'bg-red-500/10' }
  ];

  // Dynamic column type distribution
  const { pieData, totalColumns } = useMemo(() => {
    const typeData: Record<string, number> = {};
    dataset.columns.forEach(col => {
      const type = col.type || 'Unknown';
      typeData[type] = (typeData[type] || 0) + 1;
    });
    const total = Object.values(typeData).reduce((sum, val) => sum + val, 0);
    return {
      totalColumns: total,
      pieData: Object.entries(typeData).map(([name, value]) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1)
      }))
    };
  }, [dataset]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Missing values by column with highlight
  const missingColumns = useMemo(() => {
    return dataset.columns
      .filter(col => typeof col.missingCount === 'number' && col.missingCount > 0)
      .map(col => ({
        ...col,
        highlight: selectedType ? col.type === selectedType : true
      }));
  }, [dataset, selectedType]);

  const previewData = dataset.data.slice(0, 5);

  // Generate dynamic color
  const generateColor = (index: number) => `hsl(${(index * 60) % 360}, 70%, 50%)`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Data Overview</h2>
        <p className="text-gray-400">Dataset: {dataset.name}</p>
        <p className="text-gray-400 text-sm">Uploaded: {dataset.uploadedAt.toLocaleString()}</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="flex gap-6 overflow-x-auto py-2">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`${card.bgColor} rounded-lg p-6 border border-gray-700 backdrop-blur-sm hover:scale-105 transition-transform duration-200 min-w-[200px]`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{card.title}</p>
                  <motion.p className={`text-2xl font-bold ${card.color}`} initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}>
                    {card.value}
                  </motion.p>
                </div>
                <Icon className={`h-8 w-8 ${card.color}`} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column Types Distribution */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-purple-400" />
            Column Types Distribution
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  onClick={(data) => setSelectedType(data.name)}
                  cursor="pointer"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index] || generateColor(index)}
                      stroke={selectedType === entry.name ? '#fff' : undefined}
                      strokeWidth={selectedType === entry.name ? 3 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white">
                        <p><strong>{data.name}</strong></p>
                        <p>Count: {data.value}</p>
                        <p>Percentage: {data.percentage}%</p>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ color: '#F3F4F6' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center mt-12">No column type data available</p>
          )}
        </motion.div>

        {/* Missing Values by Column */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
            Missing Values by Column
          </h3>
          {missingColumns.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={missingColumns}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white">
                        <p><strong>{data.name}</strong></p>
                        <p>Missing: {data.missingCount}</p>
                        <p>Type: {data.type}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="missingCount">
                  {missingColumns.map((col, idx) => (
                    <Cell
                      key={`barcell-${idx}`}
                      fill={col.highlight ? '#F59E0B' : '#374151'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center mt-12">No missing values in dataset</p>
          )}
        </motion.div>
      </div>

      {/* Data Preview Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
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
                    <td
                      key={col.name}
                      className={`p-3 text-gray-300 ${selectedType === col.type ? 'bg-gray-700/40 font-semibold' : ''}`}
                    >
                      {row[col.name]?.toString() || '-'}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Totals row for numeric columns */}
              <tr className="border-t border-gray-600 font-semibold">
                {dataset.columns.map(col => {
                  const isNumeric = typeof dataset.data[0][col.name] === 'number';
                  const total = isNumeric ? dataset.data.reduce((sum, row) => sum + (row[col.name] || 0), 0) : '-';
                  return <td key={col.name} className="p-3 text-gray-300">{total}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Overview;
