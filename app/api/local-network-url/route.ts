import { networkInterfaces } from "node:os";
import { NextResponse } from "next/server";

function getLanAddress() {
  const interfaces = networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
}

export async function GET(request: Request) {
  const address = getLanAddress();
  if (!address) {
    return NextResponse.json({ error: "No se encontró una red local disponible." }, { status: 503 });
  }

  const host = request.headers.get("host") ?? "localhost:3000";
  const port = host.match(/:(\d+)$/)?.[1] ?? "3000";

  return NextResponse.json({ url: `http://${address}:${port}` }, { headers: { "Cache-Control": "no-store" } });
}
