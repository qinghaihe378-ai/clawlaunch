export async function onRequestGet() {
  return new Response(JSON.stringify({
    code: 200,
    msg: "success",
    data: { status: "ok" }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
