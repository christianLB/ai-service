// Export only the provider component from this file
export { AuthProvider } from './AuthContext';

// Export context and types from separate files
export { AuthContext } from './AuthContext.context';
export type { User, AuthContextType, AuthState, AuthProviderProps } from './AuthContext.types';