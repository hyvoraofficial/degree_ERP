'use client';

import * as React from 'react';
import { branchService, Branch } from '@/services/branch.service';

interface BranchContextType {
  branches: Branch[];
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  selectedBranch: Branch | null;
  isLoadingBranches: boolean;
  refreshBranches: () => Promise<void>;
}

const BranchContext = React.createContext<BranchContextType>({
  branches: [],
  selectedBranchId: '',
  setSelectedBranchId: () => {},
  selectedBranch: null,
  isLoadingBranches: false,
  refreshBranches: async () => {},
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeBranchId') || '';
    }
    return '';
  });
  const [isLoadingBranches, setIsLoadingBranches] = React.useState(false);

  const fetchBranches = React.useCallback(async () => {
    setIsLoadingBranches(true);
    try {
      const res = await branchService.findAll('', '', 1, 100);
      const branchList = res.branches || [];
      setBranches(branchList);
      
      const saved = localStorage.getItem('activeBranchId');
      if (saved) {
        const match = branchList.find(b => 
          b.id === saved || 
          b.name.toLowerCase() === saved.toLowerCase() || 
          b.code.toLowerCase() === saved.toLowerCase()
        );
        if (match) {
          setSelectedBranchIdState(match.id);
          localStorage.setItem('activeBranchId', match.id);
        } else {
          setSelectedBranchIdState('');
          localStorage.removeItem('activeBranchId');
        }
      } else {
        // Default to All Branches
        setSelectedBranchIdState('');
      }
    } catch (err) {
      console.error('Failed to load global branches list:', err);
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const setSelectedBranchId = (id: string) => {
    setSelectedBranchIdState(id);
    if (id) {
      localStorage.setItem('activeBranchId', id);
    } else {
      localStorage.removeItem('activeBranchId');
    }
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null;

  return (
    <BranchContext.Provider value={{
      branches,
      selectedBranchId,
      setSelectedBranchId,
      selectedBranch,
      isLoadingBranches,
      refreshBranches: fetchBranches,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  return React.useContext(BranchContext);
}
