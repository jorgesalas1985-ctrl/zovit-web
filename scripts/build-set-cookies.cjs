const fs = require("fs");
const path = require("path");
const cookies = require("./_auth_cookies.json");
const lines = cookies.map(
  (c) =>
    `document.cookie = ${JSON.stringify(
      `${c.name}=${c.value}; Path=/; Secure; SameSite=Lax`
    )};`
);
lines.push('location.href = "/cliente/mapa";');
fs.writeFileSync(path.join(__dirname, "_set_cookies.js"), lines.join("\n"), "utf8");
console.log("ok", fs.statSync(path.join(__dirname, "_set_cookies.js")).size);
