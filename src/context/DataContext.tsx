import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dataset, ColumnInfo, DataSummary, AIInsight } from '../types';

interface DataContextType {
  dataset: Dataset | null;
  dataSummary: DataSummary | null;
  aiInsights: AIInsight[];
  isLoading: boolean;
  setDataset: (dataset: Dataset | null) => void;
  setDataSummary: (summary: DataSummary | null) => void;
  setAIInsights: (insights: AIInsight[]) => void;
  setIsLoading: (loading: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <DataContext.Provider
      value={{
        dataset,
        dataSummary,
        aiInsights,
        isLoading,
        setDataset,
        setDataSummary,
        setAIInsights,
        setIsLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};