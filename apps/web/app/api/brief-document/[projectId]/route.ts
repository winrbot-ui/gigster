import { backendFetch } from "@/lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;

  try {
    const res = await backendFetch(
      `/ext/brief/document/${projectId}?format=pdf`,
      { method: "GET", headers: { "content-type": "application/pdf" } },
    );
    if (!res.ok) {
      const body = await res.text();
      return new Response(body || "Download failed", { status: res.status });
    }
    const bytes = await res.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="brief-${projectId.slice(0, 8)}.pdf"`,
      },
    });
  } catch {
    return new Response("Backend unavailable", { status: 503 });
  }
}
