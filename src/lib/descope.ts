import { DescopeClient } from '@descope/nextjs-sdk/server';

const descopeClient = DescopeClient({
  projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID || '',
  managementKey: process.env.DESCOPE_MANAGEMENT_KEY,
});

export default descopeClient;
