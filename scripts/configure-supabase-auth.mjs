const projectRef = process.env.SUPABASE_PROJECT_REF ?? "rtsfgzyqzcibmtifdfbp";
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("Falta SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const payload = {
  site_url: "https://www.zovit.cl",
  uri_allow_list:
    "http://localhost:3000/**,http://localhost:3001/**,http://localhost:3002/**,http://localhost:3003/**,http://localhost:3004/**,https://www.zovit.cl/**,https://zovit.cl/**,https://*.vercel.app/**",
};

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const text = await response.text();
if (!response.ok) {
  console.error("Error", response.status, text);
  process.exit(1);
}

const data = JSON.parse(text);
console.log(
  JSON.stringify(
    {
      site_url: data.site_url,
      uri_allow_list: data.uri_allow_list,
    },
    null,
    2
  )
);
