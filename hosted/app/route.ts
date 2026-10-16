import html from "../home.html?raw";
export function GET() { return new Response(html, {headers:{"Content-Type":"text/html; charset=utf-8"}}); }
