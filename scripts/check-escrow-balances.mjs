const baseURL = process.env.NEXT_PUBLIC_TW_BASE_URL;
const apiKey = process.env.NEXT_PUBLIC_TW_API_KEY;

if (!baseURL || !apiKey) {
  console.error("Missing NEXT_PUBLIC_TW_BASE_URL or NEXT_PUBLIC_TW_API_KEY");
  process.exit(1);
}

const contractIds = [
  "CD3SMJVDHJ5H2BYADHOUTIDWMJCRCWS46K5FKKC6TD46AVQOX3LI7HDV",
  "CCY5SY3PE5UKTSJSWKR5SOYBRLUBJW3BFHJMXBIEEOSWIL45ACJWBYC",
];

const params = new URLSearchParams();
for (const id of contractIds) {
  params.append("addresses", id);
}

const url = `${baseURL}/helper/get-multiple-escrow-balance?${params.toString()}`;

const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

if (!response.ok) {
  const text = await response.text();
  console.error(`Request failed: ${response.status}`);
  console.error(text);
  process.exit(1);
}

const data = await response.json();
console.log("Escrow balances:");
for (const entry of data) {
  console.log(`${entry.address}: ${entry.balance}`);
}
