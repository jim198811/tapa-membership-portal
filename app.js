const $=id=>document.getElementById(id),views=["home","apply","status","admin"];
window.openView=id=>{views.forEach(v=>$(v).classList.toggle("hidden",v!==id));document.querySelectorAll(".nav[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===id));if(id==="admin")checkAdmin();window.scrollTo({top:0,behavior:"smooth"})};
document.querySelectorAll(".nav[data-view]").forEach(b=>b.onclick=()=>openView(b.dataset.view));
$("shareBtn").onclick=async()=>{const d={title:"TAPA Membership Portal",text:"Complete your Tobago Agro Processors Association membership registration.",url:location.href};if(navigator.share)await navigator.share(d);else{await navigator.clipboard.writeText(location.href);alert("Portal link copied. Paste it into the TAPA group.")}};
const creds=["Food Badge","Farmers Badge","Agro-processing Badge","Free Sale Certificate","Food Safety Training","GMP","HACCP","Other"],supports=["Business Registration","Accounting","Product Development","Marketing","Research / Innovation","Sales","Distribution","Product Testing","Packaging & Labelling","Food Safety / Certification","Financing","Export Readiness","Other"];
async function loadCategories() {
  const categoryList = document.getElementById("categoryList");
  const primaryGroup = document.getElementById("primaryGroup");

  try {
    const response = await fetch("/api/public/categories");
    const categories = await response.json();

    if (!response.ok) {
      throw new Error("Could not load processor classifications.");
    }

    // Your Worker returns an array of names such as:
    // ["Dairy", "Honey", "Bakery & Confectionery", etc.]

    const names = categories.map((item) =>
      typeof item === "string" ? item : item.name
    );

    // Multiple category checkboxes
    if (categoryList) {
      categoryList.innerHTML = names.map((name) => `
        <label class="check">
          <input
            type="checkbox"
            name="categories"
            value="${esc(name)}"
          >
          ${esc(name)}
        </label>
      `).join("");
    }

    // Primary Processor Classification dropdown
    if (primaryGroup) {
      primaryGroup.innerHTML = `
        <option value="">Select processor classification</option>
        ${names.map((name) => `
          <option value="${esc(name)}">
            ${esc(name)}
          </option>
        `).join("")}
      `;
    }

  } catch (err) {
    console.error("Processor classification error:", err);

    if (primaryGroup) {
      primaryGroup.innerHTML =
        `<option value="">Unable to load classifications</option>`;
    }
  }
}
async function checkAdmin(){const me=await fetch("/api/admin/me").then(r=>r.json());$("adminLogin").classList.toggle("hidden",me.authenticated);$("adminPanel").classList.toggle("hidden",!me.authenticated);if(me.authenticated){loadDashboard();loadApplications();loadAdminCategories()}}
$("loginBtn").onclick=async()=>{const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("adminEmail").value,password:$("adminPassword").value})}),j=await r.json();if(!r.ok){$("loginMsg").innerHTML=`<div class="message bad">${esc(j.error)}</div>`;return}checkAdmin()};
$("logoutBtn").onclick=async()=>{await fetch("/api/admin/logout",{method:"POST"});checkAdmin()};
async function loadDashboard(){const j=await fetch("/api/admin/dashboard").then(r=>r.json());$("stTotal").textContent=j.total;$("stPending").textContent=j.pending;$("stReview").textContent=j.review;$("stApproved").textContent=j.approved}
async function loadApplications(){const q=encodeURIComponent($("searchApps").value||""),s=encodeURIComponent($("filterStatus").value||"");const rows=await fetch(`/api/admin/applications?q=${q}&status=${s}`).then(r=>r.json());$("appRows").innerHTML=rows.map(r=>`<tr><td>${esc(r.application_no)}</td><td>${esc(r.full_name)}</td><td>${esc(r.business_name||"-")}</td><td>${esc(r.primary_group)}</td><td><span class="badge">${esc(r.status)}</span></td><td><button class="secondary" onclick="viewApp(${r.id})">Review</button></td></tr>`).join("")||'<tr><td colspan="6">No applications found.</td></tr>'}
$("searchBtn").onclick=loadApplications;
window.viewApp=async id=>{const a=await fetch("/api/admin/applications/"+id).then(r=>r.json());const items=[["Application",a.application_no],["Name",a.full_name],["Email",a.email],["Phone",a.phone],["Address",a.address],["Business",a.business_name||"-"],["Business Type",a.business_type],["Description",a.business_description],["Primary Group",a.primary_group],["Other Groups",(a.categories||[]).join(", ")||"-"],["Products",a.products||"-"],["Years in Business",a.years_business],["Credentials",(a.credentials||[]).join(", ")||"-"],["Support Needs",(a.support_needs||[]).join(", ")||"-"],["Member Expectations",a.expectations||"-"]];$("modalBody").innerHTML=`<h2>${esc(a.application_no)}</h2><div class="detailgrid">${items.map(([k,v])=>`<div class="detail"><small>${esc(k)}</small>${esc(v)}</div>`).join("")}</div><h3 style="margin-top:20px">Documents</h3>${(a.documents||[]).length?a.documents.map(d=>`<p><a target="_blank" href="/api/admin/documents/${d.id}">${esc(d.original_name)}</a></p>`).join(""):'<p class="muted">No documents uploaded.</p>'}<h3>Review</h3><label>Status<select id="reviewStatus"><option>Pending</option><option>Under Review</option><option>Approved</option><option>Rejected</option><option>More Information Required</option></select></label><label>Internal Notes<textarea id="internalNotes">${esc(a.internal_notes||"")}</textarea></label><button class="primary" onclick="saveReview(${a.id})">Save Review</button>`;$("reviewStatus").value=a.status;$("modal").classList.remove("hidden")};
window.saveReview=async id=>{const r=await fetch("/api/admin/applications/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:$("reviewStatus").value,internalNotes:$("internalNotes").value})});if(r.ok){$("modal").classList.add("hidden");loadApplications();loadDashboard()}};
$("closeModal").onclick=()=>$("modal").classList.add("hidden");
async function loadAdminCategories(){const rows=await fetch("/api/admin/categories").then(r=>r.json());$("categoryAdmin").innerHTML=rows.map(c=>`<button class="chip ${c.active?"":"off"}" onclick="toggleCategory(${c.id},${c.active?0:1})">${esc(c.name)}</button>`).join("")}
$("addCategoryBtn").onclick=async()=>{const name=$("newCategory").value.trim();if(!name)return;const r=await fetch("/api/admin/categories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});if(r.ok){$("newCategory").value="";loadAdminCategories();loadCategories()}};
window.toggleCategory=async(id,active)=>{await fetch("/api/admin/categories/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({active:!!active})});loadAdminCategories();loadCategories()};
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
if("serviceWorker"in navigator)navigator.serviceWorker.register("/service-worker.js");
