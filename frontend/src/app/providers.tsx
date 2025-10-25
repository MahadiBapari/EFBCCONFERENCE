import React from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <>
      {/* Add your providers here */}
      {/* Example: QueryClient, ThemeProvider, etc. */}
      {children}
    </>
  );
};

export default Providers;
