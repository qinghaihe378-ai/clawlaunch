export async function onRequestGet() {
  const factories = [
    {
      version: "v1",
      chains: [
        {
          chainId: 56,
          address: "0xeEDAA1271dc3a5E9D38e76Aee68229ca6B39c3Cd"
        },
        {
          chainId: 97,
          address: "0xd0C042eFc846D752f9bE26FB6e0E0D8C666F468C"
        }
      ]
    }
  ]

  return new Response(JSON.stringify({
    code: 200,
    msg: "success",
    data: { list: factories }
  }), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    }
  })
}
