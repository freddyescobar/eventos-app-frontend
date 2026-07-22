import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const netInterface of interfaces[name] || []) {
        // Skip internal (loopback) and non-ipv4 addresses
        if (netInterface.family === 'IPv4' && !netInterface.internal) {
          addresses.push(netInterface.address);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ips: addresses,
        port: 3001,
      },
    });
  } catch (error) {
    console.error('Error getting local IPs:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener IPs locales' },
      { status: 500 }
    );
  }
}
