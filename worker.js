
const SESSION_COOKIE = "tapa_admin_session";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf","image/jpeg","image/png","image/webp"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        return await api(request, env, url);
      }
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error(err);
      return json({ error: "Server error." }, 500);
    }
  }
};

async function api(request, env, url) {
  const p = url.pathname;

  if (request.method === "GET" && p === "/api/public/categories") {
    const { results } = await env.DB.prepare(
      "SELECT name FROM categories WHERE active=1 ORDER BY name"
    ).all();
    return json(results.map(r => r.name));
  }

  if (request.method === "POST" && p === "/api/applications") {
    return createApplication(request, env);
  }

  if (request.method === "POST" && p === "/api/status") {
    const body = await request.json();
    const no = String(body.applicationNo || "").trim().toUpperCase();
    const email = String(body.email || "").trim().toLowerCase();
    const row = await env.DB.prepare(
      "SELECT application_no,status,business_name,full_name,primary_group,created_at FROM applications WHERE application_no=? AND lower(email)=?"
    ).bind(no, email).first();
    return row ? json(row) : json({ error: "No matching application found." }, 404);
  }

  if (request.method === "POST" && p === "/api/admin/login") {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const expectedEmail = String(env.ADMIN_EMAIL || "").trim().toLowerCase();
    const expectedPassword = String(env.ADMIN_PASSWORD || "");
    if (!expectedEmail || !expectedPassword || email !== expectedEmail || !safeEqual(password, expectedPassword)) {
      return json({ error: "Invalid email or password." }, 401);
    }
    const exp = Math.floor(Date.now()/1000) + 8*60*60;
    const payload = b64url(JSON.stringify({ email, exp }));
    const sig = await sign(payload, env.SESSION_SECRET);
    return new Response(JSON.stringify({ ok:true, email }), {
      headers: {
        "content-type":"application/json",
        "set-cookie": `${SESSION_COOKIE}=${payload}.${sig}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
      }
    });
  }

  if (request.method === "POST" && p === "/api/admin/logout") {
    return new Response(JSON.stringify({ok:true}), {
      headers: {"content-type":"application/json","set-cookie":`${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`}
    });
  }

  if (request.method === "GET" && p === "/api/admin/me") {
    const s = await getSession(request, env);
    return json({ authenticated: !!s, email: s?.email || null });
  }

  const session = await getSession(request, env);
  if (!session && p.startsWith("/api/admin/")) return json({ error:"Unauthorized" }, 401);

  if (request.method === "GET" && p === "/api/admin/dashboard") {
    const total = await scalar(env, "SELECT count(*) c FROM applications");
    const pending = await scalar(env, "SELECT count(*) c FROM applications WHERE status='Pending'");
    const review = await scalar(env, "SELECT count(*) c FROM applications WHERE status='Under Review'");
    const approved = await scalar(env, "SELECT count(*) c FROM applications WHERE status='Approved'");
    const {results:groups} = await env.DB.prepare(
      "SELECT primary_group name,count(*) count FROM applications GROUP BY primary_group ORDER BY count DESC"
    ).all();
    return json({total,pending,review,approved,groups});
  }

  if (request.method === "GET" && p === "/api/admin/applications") {
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    let sql = "SELECT id,application_no,created_at,status,full_name,email,phone,business_name,primary_group FROM applications WHERE 1=1";
    const binds = [];
    if (q) {
      sql += " AND (full_name LIKE ? OR business_name LIKE ? OR application_no LIKE ?)";
      binds.push(`%${q}%`,`%${q}%`,`%${q}%`);
    }
    if (status) { sql += " AND status=?"; binds.push(status); }
    sql += " ORDER BY id DESC";
    const stmt = env.DB.prepare(sql);
    const {results} = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
    return json(results);
  }

  const appMatch = p.match(/^\/api\/admin\/applications\/(\d+)$/);
  if (appMatch && request.method === "GET") {
    const id = Number(appMatch[1]);
    const row = await env.DB.prepare("SELECT * FROM applications WHERE id=?").bind(id).first();
    if (!row) return json({error:"Not found"},404);
    row.categories = parseJSON(row.categories, []);
    row.credentials = parseJSON(row.credentials, []);
    row.support_needs = parseJSON(row.support_needs, []);
    const {results:docs} = await env.DB.prepare(
      "SELECT id,original_name,object_key,mime,created_at FROM documents WHERE application_id=? ORDER BY id"
    ).bind(id).all();
    row.documents = docs;
    return json(row);
  }

  if (appMatch && request.method === "PATCH") {
    const id = Number(appMatch[1]);
    const body = await request.json();
    const allowed = ["Pending","Under Review","Approved","Rejected","More Information Required"];
    if (!allowed.includes(body.status)) return json({error:"Invalid status"},400);
    await env.DB.prepare(
      "UPDATE applications SET status=?, internal_notes=? WHERE id=?"
    ).bind(body.status, String(body.internalNotes||""), id).run();
    return json({ok:true});
  }

  const docMatch = p.match(/^\/api\/admin\/documents\/(\d+)$/);
  if (docMatch && request.method === "GET") {
    const doc = await env.DB.prepare("SELECT * FROM documents WHERE id=?").bind(Number(docMatch[1])).first();
    if (!doc) return json({error:"Not found"},404);
    const obj = await env.FILES.get(doc.object_key);
    if (!obj) return json({error:"File not found"},404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("content-type", doc.mime || "application/octet-stream");
    headers.set("content-disposition", `inline; filename="${sanitizeHeader(doc.original_name)}"`);
    return new Response(obj.body,{headers});
  }

  if (request.method === "GET" && p === "/api/admin/export.csv") {
    const {results:rows} = await env.DB.prepare(
      "SELECT application_no,created_at,status,full_name,phone,email,business_name,business_type,business_description,primary_group,products,years_business FROM applications ORDER BY id"
    ).all();
    const cols=["application_no","created_at","status","full_name","phone","email","business_name","business_type","business_description","primary_group","products","years_business"];
    const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
    const csv=[cols.join(","),...rows.map(r=>cols.map(c=>esc(r[c])).join(","))].join("\n");
    return new Response(csv,{headers:{"content-type":"text/csv;charset=utf-8","content-disposition":'attachment; filename="TAPA_members.csv"'}});
  }

  if (request.method === "GET" && p === "/api/admin/categories") {
    const {results}=await env.DB.prepare("SELECT * FROM categories ORDER BY name").all();
    return json(results);
  }

  if (request.method === "POST" && p === "/api/admin/categories") {
    const body = await request.json();
    const name = String(body.name||"").trim();
    if (!name) return json({error:"Name required"},400);
    try {
      await env.DB.prepare("INSERT INTO categories(name,active) VALUES (?,1)").bind(name).run();
      return json({ok:true});
    } catch {
      return json({error:"Category already exists."},400);
    }
  }

  const catMatch = p.match(/^\/api\/admin\/categories\/(\d+)$/);
  if (catMatch && request.method === "PATCH") {
    const body = await request.json();
    await env.DB.prepare("UPDATE categories SET active=? WHERE id=?").bind(body.active?1:0,Number(catMatch[1])).run();
    return json({ok:true});
  }

  return json({error:"Not found"},404);
}

async function createApplication(request, env) {
  const form = await request.formData();
  const fullName = text(form,"fullName");
  const address = text(form,"address");
  const phone = text(form,"phone");
  const email = text(form,"email").toLowerCase();
  const primaryGroup = text(form,"primaryGroup");
  const declaration = text(form,"declaration");
  if (!fullName || !address || !phone || !email || !primaryGroup || declaration !== "yes") {
    return json({error:"Please complete all required fields and declaration."},400);
  }

  const categories = form.getAll("categories").map(String);
  const credentials = form.getAll("credentials").map(String);
  const supportNeeds = form.getAll("supportNeeds").map(String);
  const createdAt = new Date().toISOString();

  const info = await env.DB.prepare(`INSERT INTO applications(
    created_at,status,full_name,gender,age_group,id_number,address,mailing_address,phone,email,
    registered_business,business_name,business_type,business_description,categories,primary_group,
    products,years_business,credentials,support_needs,expectations,declaration,signature_name,internal_notes
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    createdAt,"Pending",fullName,text(form,"gender"),text(form,"ageGroup"),text(form,"idNumber"),
    address,text(form,"mailingAddress"),phone,email,text(form,"registeredBusiness"),text(form,"businessName"),
    text(form,"businessType"),text(form,"businessDescription"),JSON.stringify(categories),primaryGroup,
    text(form,"products"),text(form,"yearsBusiness"),JSON.stringify(credentials),JSON.stringify(supportNeeds),
    text(form,"expectations"),1,text(form,"signatureName") || fullName,""
  ).run();

  const id = Number(info.meta.last_row_id);
  const applicationNo = `TAPA-${new Date().getFullYear()}-${String(id).padStart(5,"0")}`;
  await env.DB.prepare("UPDATE applications SET application_no=? WHERE id=?").bind(applicationNo,id).run();

  const files = form.getAll("documents").filter(x => x && typeof x === "object" && "arrayBuffer" in x && x.size > 0);
  for (const file of files.slice(0,6)) {
    if (file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(file.type)) continue;
    const key = `applications/${id}/${crypto.randomUUID()}-${safeName(file.name)}`;
    await env.FILES.put(key, await file.arrayBuffer(), {httpMetadata:{contentType:file.type}});
    await env.DB.prepare(
      "INSERT INTO documents(application_id,original_name,object_key,mime,created_at) VALUES (?,?,?,?,?)"
    ).bind(id,file.name,key,file.type,createdAt).run();
  }

  return json({ok:true,applicationNo,status:"Pending"});
}

async function scalar(env, sql) {
  const r = await env.DB.prepare(sql).first();
  return Number(r?.c || 0);
}
function text(form,k){ return String(form.get(k)||"").trim(); }
function parseJSON(s,d){ try{return JSON.parse(s||"")}catch{return d} }
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store"}})}
function safeName(s){return String(s||"file").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120)}
function sanitizeHeader(s){return String(s||"file").replace(/[\r\n"]/g,"_").slice(0,120)}
function safeEqual(a,b){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
function b64url(s){return btoa(unescape(encodeURIComponent(s))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")}
async function sign(payload, secret){
  if (!secret) {
    throw new Error("SESSION_SECRET is missing.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return [...new Uint8Array(sig)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
async function getSession(request,env){
  const cookie=request.headers.get("cookie")||"";
  const raw=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(SESSION_COOKIE+"="))?.slice(SESSION_COOKIE.length+1);
  if(!raw)return null;
  const [payload,sig]=raw.split(".");
  if(!payload||!sig)return null;
  const expected=await sign(payload,env.SESSION_SECRET||"");
  if(!safeEqual(sig,expected))return null;
  try{
    const padded=payload.replaceAll("-","+").replaceAll("_","/")+"===".slice((payload.length+3)%4);
    const obj=JSON.parse(decodeURIComponent(escape(atob(padded))));
    if(!obj.exp||obj.exp<Math.floor(Date.now()/1000))return null;
    return obj;
  }catch{return null}
}
