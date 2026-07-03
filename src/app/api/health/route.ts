import { NextResponse } from 'next/server';
import packageJson from '../../../../package.json';
import { NO_STORE_HEADERS } from '../../../../lib/services/http-headers';

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      service: packageJson.name,
      version: packageJson.version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      runtime: {
        node: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    },
    {
      status: 200,
      headers: NO_STORE_HEADERS
    }
  );
}
