// ============================================================
// TAPA MEMBERSHIP PORTAL - FRONT END
// Matches current Cloudflare worker.js
// ============================================================

const $ = (id) => document.getElementById(id);

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

let currentApplicationId = null;


// ============================================================
// PAGE NAVIGATION
// ============================================================

const views = ["home", "apply", "status", "admin"];

window.openView = function (id) {
  views.forEach((view) => {
    const el = $(view);

    if (el) {
      el.classList.toggle("hidden", view !== id);
    }
  });

  document
    .querySelectorAll(".nav[data-view]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === id
      );
    });

  if (id === "admin") {
    checkAdmin();
  }
};


document
  .querySelectorAll(".nav[data-view]")
  .forEach((button) => {
    button.onclick = () =>
      openView(button.dataset.view);
  });


// ============================================================
// SHARE
// ============================================================

const shareBtn = $("shareBtn");

if (shareBtn) {
  shareBtn.onclick = async () => {
    const data = {
      title: "TAPA Membership Portal",

      text:
        "Complete your Tobago Agro Processors Association membership registration.",

      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(
          window.location.href
        );

        alert(
          "Portal link copied to clipboard."
        );
      }
    } catch (err) {
      console.error(err);
    }
  };
}


// ============================================================
// PUBLIC PROCESSOR GROUPS
// ============================================================

async function loadCategories() {
  const categoryList = $("categoryList");
  const primaryGroup = $("primaryGroup");

  try {
    const response = await fetch("/api/public/categories");
    const categories = await response.json();

    if (!response.ok) {
      throw new Error(
        categories.error || "Could not load processor groups."
      );
    }

    const groups = categories
      .map(item => typeof item === "string" ? item : item.name)
      .filter(Boolean);

    if (categoryList) {
      categoryList.innerHTML = groups.map(name => `
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

    if (primaryGroup) {
      primaryGroup.innerHTML = `
        <option value="">Select Primary Processor Group</option>
        ${groups.map(name => `
          <option value="${esc(name)}">
            ${esc(name)}
          </option>
        `).join("")}
      `;
    }

  } catch (err) {
    console.error("Category load error:", err);

    if (primaryGroup) {
      primaryGroup.innerHTML =
        `<option value="">Unable to load processor groups</option>`;
    }
  }
}

// ============================================================
// CREDENTIAL / CERTIFICATE OPTIONS
// ============================================================

const credentials = [
  "Food Badge",
  "Farmers Badge",
  "Agro-processing Badge",
  "Free Sale Certificate",
  "Food Safety Training",
  "GMP",
  "HACCP",
  "Other"
];

const credentialList =
  $("credentialList");

if (credentialList) {
  credentialList.innerHTML =
    credentials
      .map(
        (item) => `
          <label class="check">
            <input
              type="checkbox"
              name="credentials"
              value="${esc(item)}"
            >
            ${esc(item)}
          </label>
        `
      )
      .join("");
}


// ============================================================
// MEMBERSHIP APPLICATION
// ============================================================

const applicationForm =
  $("applicationForm");

if (applicationForm) {
  applicationForm.onsubmit =
    async (event) => {
      event.preventDefault();

      const formMsg =
        $("formMsg");

      if (formMsg) {
        formMsg.innerHTML =
          `<div class="message">
            Submitting registration...
          </div>`;
      }

      try {
        const formData =
          new FormData(
            applicationForm
          );

        const response =
          await fetch(
            "/api/applications",
            {
              method: "POST",
              body: formData
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Registration failed."
          );
        }

        if (formMsg) {
          formMsg.innerHTML = `
            <div class="message success">
              <strong>
                Registration submitted.
              </strong>
              <br>
              Your application number is
              <strong>
                ${esc(
                  result.application_no ||
                  result.applicationNo
                )}
              </strong>.
              Save it to check your status.
            </div>
          `;
        }

        applicationForm.reset();

        await loadCategories();

      } catch (err) {
        console.error(
          "Application error:",
          err
        );

        if (formMsg) {
          formMsg.innerHTML = `
            <div class="message error">
              ${esc(err.message)}
            </div>
          `;
        }
      }
    };
}


// ============================================================
// CHECK APPLICATION STATUS
// ============================================================

const checkStatusBtn =
  $("checkStatusBtn");

if (checkStatusBtn) {
  checkStatusBtn.onclick =
    async () => {

      const applicationNo =
        $("applicationNo")?.value?.trim() ||
        $("statusApplicationNo")
          ?.value?.trim() ||
        "";

      const email =
        $("statusEmail")
          ?.value?.trim() ||
        $("checkEmail")
          ?.value?.trim() ||
        "";

      const statusMsg =
        $("statusMsg") ||
        $("statusResult");

      if (
        !applicationNo ||
        !email
      ) {
        if (statusMsg) {
          statusMsg.innerHTML =
            `<div class="message error">
              Enter your application number and email.
            </div>`;
        }

        return;
      }

      try {
        const response =
          await fetch(
            "/api/status",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  applicationNo,
                  email
                })
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Application not found."
          );
        }

        if (statusMsg) {
          statusMsg.innerHTML = `
            <div class="message">
              <strong>
                ${esc(
                  result.business_name ||
                  result.full_name ||
                  "Application"
                )}
              </strong>
              <br>

              ${esc(
                result.application_no
              )}

              <br>

              Status:
              <strong>
                ${esc(result.status)}
              </strong>

              ${
                result.primary_group
                  ? `<br>
                     Primary Group:
                     ${esc(
                       result.primary_group
                     )}`
                  : ""
              }
            </div>
          `;
        }

      } catch (err) {
        if (statusMsg) {
          statusMsg.innerHTML = `
            <div class="message error">
              ${esc(err.message)}
            </div>
          `;
        }
      }
    };
}


// ============================================================
// ADMIN AUTHENTICATION
// ============================================================

async function checkAdmin() {
  try {
    const response =
      await fetch(
        "/api/admin/me",
        {
          credentials:
            "same-origin"
        }
      );

    const result =
      await response.json();

    const loggedIn =
      response.ok &&
      result.authenticated === true;

    $("adminLogin")
      ?.classList.toggle(
        "hidden",
        loggedIn
      );

    $("adminPanel")
      ?.classList.toggle(
        "hidden",
        !loggedIn
      );

    if (loggedIn) {
      await Promise.all([
        loadDashboard(),
        loadApplications(),
        loadAdminCategories()
      ]);
    }

  } catch (err) {
    console.error(
      "Admin check:",
      err
    );

    $("adminLogin")
      ?.classList.remove(
        "hidden"
      );

    $("adminPanel")
      ?.classList.add(
        "hidden"
      );
  }
}


// ============================================================
// ADMIN LOGIN
// ============================================================

const loginBtn =
  $("loginBtn");

if (loginBtn) {
  loginBtn.onclick =
    async () => {

      const email =
        $("adminEmail")
          ?.value?.trim() ||
        $("loginEmail")
          ?.value?.trim() ||
        "";

      const password =
        $("adminPassword")
          ?.value ||
        $("loginPassword")
          ?.value ||
        "";

      const loginMsg =
        $("loginMsg") ||
        $("adminLoginMsg");

      try {
        const response =
          await fetch(
            "/api/admin/login",
            {
              method: "POST",

              credentials:
                "same-origin",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  email,
                  password
                })
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Invalid email or password."
          );
        }

        if (loginMsg) {
          loginMsg.textContent =
            "";
        }

        if ($("adminPassword")) {
          $("adminPassword").value =
            "";
        }

        if ($("loginPassword")) {
          $("loginPassword").value =
            "";
        }

        await checkAdmin();

      } catch (err) {
        if (loginMsg) {
          loginMsg.textContent =
            err.message;
        }
      }
    };
}


// ============================================================
// ADMIN LOGOUT
// ============================================================

const logoutBtn =
  $("logoutBtn");

if (logoutBtn) {
  logoutBtn.onclick =
    async () => {

      await fetch(
        "/api/admin/logout",
        {
          method: "POST",
          credentials:
            "same-origin"
        }
      );

      await checkAdmin();
    };
}


// ============================================================
// ADMIN DASHBOARD COUNTS
// ============================================================

async function loadDashboard() {
  try {
    const response =
      await fetch(
        "/api/admin/summary",
        {
          credentials:
            "same-origin"
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Unable to load dashboard."
      );
    }

    setText(
      "stTotal",
      result.total
    );

    setText(
      "stPending",
      result.pending
    );

    setText(
      "stReview",
      result.underReview
    );

    setText(
      "stUnderReview",
      result.underReview
    );

    setText(
      "stApproved",
      result.approved
    );

    setText(
      "stRejected",
      result.rejected
    );

  } catch (err) {
    console.error(
      "Dashboard error:",
      err
    );
  }
}


// ============================================================
// ADMIN APPLICATION LIST
// ============================================================

async function loadApplications() {
  const search =
    $("searchApps")
      ?.value?.trim() || "";

  const status =
    $("filterStatus")
      ?.value?.trim() || "";

  const query =
    new URLSearchParams();

  if (search) {
    query.set(
      "search",
      search
    );
  }

  if (
    status &&
    status !== "All statuses"
  ) {
    query.set(
      "status",
      status
    );
  }

  try {
    const response =
      await fetch(
        `/api/admin/applications?${query.toString()}`,
        {
          credentials:
            "same-origin"
        }
      );

    const applications =
      await response.json();

    if (!response.ok) {
      throw new Error(
        applications.error ||
        "Unable to load applications."
      );
    }

    renderApplications(
      applications
    );

  } catch (err) {
    console.error(
      "Application list error:",
      err
    );
  }
}


function renderApplications(
  applications
) {
  const tbody =
    $("applicationRows") ||
    $("applicationsRows") ||
    $("applicationList") ||
    document.querySelector(
      "#adminPanel tbody"
    );

  if (!tbody) {
    console.warn(
      "Application table body not found."
    );

    return;
  }

  if (
    !applications ||
    applications.length === 0
  ) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          No applications found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    applications
      .map(
        (app) => `
          <tr>
            <td>
              ${esc(
                app.application_no
              )}
            </td>

            <td>
              ${esc(
                app.full_name
              )}
            </td>

            <td>
              ${esc(
                app.business_name ||
                "-"
              )}
            </td>

            <td>
              ${esc(
                app.primary_group ||
                "-"
              )}
            </td>

            <td>
              <strong>
                ${esc(
                  app.status
                )}
              </strong>
            </td>

            <td>
              <button
                type="button"
                class="btn review-btn"
                data-id="${Number(
                  app.id
                )}"
              >
                Review
              </button>
            </td>
          </tr>
        `
      )
      .join("");

  tbody
    .querySelectorAll(
      ".review-btn"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          window.viewApp(
            Number(
              button.dataset.id
            )
          );
        }
      );
    });
}


// ============================================================
// SEARCH APPLICATIONS
// ============================================================

const searchBtn =
  $("searchBtn");

if (searchBtn) {
  searchBtn.onclick =
    loadApplications;
}


if ($("searchApps")) {
  $("searchApps")
    .addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();

          loadApplications();
        }
      }
    );
}


if ($("filterStatus")) {
  $("filterStatus")
    .addEventListener(
      "change",
      loadApplications
    );
}


// ============================================================
// REVIEW APPLICATION
// ============================================================

window.viewApp =
  async function (id) {

    currentApplicationId =
      Number(id);

    try {
      const response =
        await fetch(
          `/api/admin/applications/${currentApplicationId}`,
          {
            credentials:
              "same-origin"
          }
        );

      const app =
        await response.json();

      if (!response.ok) {
        throw new Error(
          app.error ||
          "Could not open application."
        );
      }

      openApplicationModal(app);

    } catch (err) {
      console.error(
        "Review error:",
        err
      );

      alert(err.message);
    }
  };


// ============================================================
// APPLICATION REVIEW MODAL
// ============================================================

function openApplicationModal(app) {
  let modal =
    $("modal");

  if (!modal) {
    modal =
      document.createElement(
        "div"
      );

    modal.id = "modal";
    modal.className = "modal";

    modal.innerHTML = `
      <div class="modal-card">
        <button
          type="button"
          id="dynamicCloseModal"
          style="
            float:right;
            cursor:pointer;
          "
        >
          ×
        </button>

        <div id="modalBody"></div>
      </div>
    `;

    document.body.appendChild(
      modal
    );
  }

  const modalBody =
    $("modalBody");

  if (!modalBody) {
    alert(
      "Review window is missing from the page."
    );

    return;
  }

  const fields = [
    ["Application", app.application_no],
    ["Membership Number", app.membership_no],
    ["Status", app.status],
    ["Full Name", app.full_name],
    ["Gender", app.gender],
    ["Age Group", app.age_group],
    ["ID Number", app.id_number],
    ["Address", app.address],
    ["Mailing Address", app.mailing_address],
    ["Phone", app.phone],
    ["Email", app.email],
    ["Registered Business", app.registered_business],
    ["Business Name", app.business_name],
    ["Business Type", app.business_type],
    ["Business Description", app.business_description],
    ["Categories", app.categories],
    ["Primary Group", app.primary_group],
    ["Products", app.products],
    ["Years in Business", app.years_business],
    ["Credentials", app.credentials],
    ["Support Needed", app.support_needed],
    ["Expectations", app.expectations],
    ["Signature", app.signature_name],
    ["Submitted", app.created_at]
  ];

  modalBody.innerHTML = `
    <h2>
      Review Application
    </h2>

    <div class="review-details">
      ${fields
        .map(
          ([label, value]) => `
            <div
              style="
                margin-bottom:10px;
                padding-bottom:8px;
                border-bottom:1px solid #ddd;
              "
            >
              <strong>
                ${esc(label)}
              </strong>
              <br>
              ${esc(
                value ||
                "-"
              )}
            </div>
          `
        )
        .join("")}
    </div>

    ${
      app.documents &&
      app.documents.length
        ? `
          <h3>Documents</h3>

          <ul>
            ${app.documents
              .map(
                (doc) => `
                  <li>
                    ${esc(
                      doc.original_name
                    )}
                  </li>
                `
              )
              .join("")}
          </ul>
        `
        : ""
    }

    <hr>

    <label>
      <strong>
        Application Status
      </strong>
    </label>

    <select
      id="reviewStatus"
      style="
        width:100%;
        margin-top:6px;
        margin-bottom:15px;
      "
    >
      ${[
        "Pending",
        "Under Review",
        "Approved",
        "Rejected"
      ]
        .map(
          (status) => `
            <option
              value="${status}"
              ${
                app.status ===
                status
                  ? "selected"
                  : ""
              }
            >
              ${status}
            </option>
          `
        )
        .join("")}
    </select>

    <label>
      <strong>
        Internal Notes
      </strong>
    </label>

    <textarea
      id="reviewNotes"
      rows="5"
      style="
        width:100%;
        margin-top:6px;
        margin-bottom:15px;
      "
    >${esc(
      app.internal_notes ||
      ""
    )}</textarea>

    <div
      style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
      "
    >
      <button
        type="button"
        id="dynamicSaveReview"
        class="btn"
      >
        Save Review
      </button>
      <button
  type="button"
  id="dynamicMembershipCard"
  class="btn"
  style="background:#2f6fed;color:white;"
>
  Membership Card
</button>
<button
  type="button"
  id="dynamicDeleteApplication"
  class="btn"
  style="background:#b42318;color:white;"
>
  Delete Application
</button>
      <button
        type="button"
        id="dynamicCloseReview"
        class="btn"
      >
        Close
      </button>
    </div>

    <div
      id="reviewMessage"
      style="margin-top:10px;"
    ></div>
  `;

  modal.classList.remove(
    "hidden"
  );

  modal.style.display =
    "block";

  $("dynamicSaveReview")
    ?.addEventListener(
      "click",
      saveReview
    );
  $("dynamicMembershipCard")
  ?.addEventListener(
    "click",
    () => openMembershipCard(app)
  );
$("dynamicDeleteApplication")
  ?.addEventListener(
    "click",
    () => deleteApplication(app.id)
  );
  $("dynamicCloseReview")
    ?.addEventListener(
      "click",
      closeReviewModal
    );

  $("dynamicCloseModal")
    ?.addEventListener(
      "click",
      closeReviewModal
    );

  $("closeModal")
    ?.addEventListener(
      "click",
      closeReviewModal
    );
}
// ============================================================
// MEMBERSHIP CARD
// ============================================================
function openMembershipCard(app) {
  if (
    app.status !== "Approved" ||
    !app.membership_no
  ) {
    alert(
      "Membership cards are only available for approved members."
    );
    return;
  }

  const memberSince =
    app.created_at
      ? new Date(app.created_at).getFullYear()
      : new Date().getFullYear();

  const memberName =
    app.full_name || "Member";

  const businessName =
    app.business_name || "Not provided";

  const processorGroup =
    app.primary_group || "Not assigned";

  const membershipNo =
    app.membership_no;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>
    TAPA Membership Card - ${esc(memberName)}
  </title>

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #ececf1;
      color: #222;
    }

    body {
      padding: 30px;
    }

    .card-wrap {
      display: flex;
      justify-content: center;
    }

    .member-card {
      width: 856px;
      min-height: 540px;
      position: relative;
      overflow: hidden;

      background:
        linear-gradient(
          135deg,
          #ffffff 0%,
          #faf9ff 55%,
          #f1edfb 100%
        );

      border-radius: 28px;
      border: 1px solid #d8d3e8;

      box-shadow:
        0 18px 50px rgba(0,0,0,.20);
    }

    .top-band {
      padding: 28px 34px;

      background:
        linear-gradient(
          135deg,
          #28155f,
          #5633a8,
          #744ec4
        );

      color: white;

      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .logo-box {
      width: 82px;
      height: 82px;

      border-radius: 18px;

      background:
        rgba(255,255,255,.16);

      border:
        2px solid rgba(255,255,255,.45);

      display: flex;
      align-items: center;
      justify-content: center;

      font-size: 27px;
      font-weight: 900;
    }

    .brand-text h1 {
      margin: 0;
      font-size: 26px;
      line-height: 1.15;
    }

    .brand-text p {
      margin: 7px 0 0;

      font-size: 13px;
      letter-spacing: 1.5px;

      text-transform: uppercase;
    }

    .active-badge {
      background: white;
      color: #21733b;

      padding: 10px 16px;

      border-radius: 30px;

      font-size: 12px;
      font-weight: 900;

      white-space: nowrap;
    }

    .content {
      padding: 34px 38px;
    }

    .official-label {
      color: #6e6590;

      font-size: 12px;
      font-weight: 900;

      letter-spacing: 1.7px;
      text-transform: uppercase;
    }

    .member-name {
      margin-top: 7px;
      margin-bottom: 25px;

      color: #231a3e;

      font-size: 36px;
      font-weight: 900;
    }

    .membership-strip {
      padding: 17px 20px;
      margin-bottom: 28px;

      background: #eee9fb;

      border-radius: 14px;
      border-left: 6px solid #5633a8;

      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }

    .label {
      color: #71678c;

      font-size: 11px;
      font-weight: 800;

      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .number {
      margin-top: 4px;

      color: #5633a8;

      font-size: 24px;
      font-weight: 900;
    }

    .member-since {
      text-align: right;
    }

    .member-since strong {
      display: block;
      margin-top: 4px;
      font-size: 18px;
    }

    .details {
      display: grid;
      grid-template-columns: 1.4fr 1fr;

      gap: 20px 28px;
    }

    .detail {
      padding-bottom: 12px;

      border-bottom:
        1px solid #ddd8e8;
    }

    .detail span {
      display: block;
      margin-bottom: 5px;

      color: #777184;

      font-size: 11px;
      font-weight: 800;

      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .detail strong {
      font-size: 17px;
    }

    .footer {
      margin-top: 28px;
      padding-top: 18px;

      border-top:
        1px solid #d8d3e3;

      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-text {
      color: #675f74;
      font-size: 12px;
      line-height: 1.5;
    }

    .qr-placeholder {
      width: 95px;
      height: 95px;

      border: 2px dashed #8d7bb8;
      border-radius: 12px;

      display: flex;
      align-items: center;
      justify-content: center;

      text-align: center;

      color: #5633a8;

      font-size: 10px;
      font-weight: 900;
    }

    .actions {
      text-align: center;
      margin-top: 24px;
    }

    .actions button {
      margin: 5px;
      padding: 12px 20px;

      border: 0;
      border-radius: 9px;

      cursor: pointer;

      font-size: 14px;
      font-weight: 800;
    }

    .print {
      background: #5633a8;
      color: white;
    }

    .close {
      background: #dddddd;
      color: #222;
    }

    @media print {
      body {
        padding: 0;
        background: white;
      }

      .member-card {
        box-shadow: none;
      }

      .actions {
        display: none;
      }
    }
  </style>
</head>

<body>

  <div class="card-wrap">

    <div class="member-card">

      <div class="top-band">

        <div class="brand">

          <div class="logo-box">
            TAPA
          </div>

          <div class="brand-text">

            <h1>
              Tobago Agro-Processors Association
            </h1>

            <p>
              Official Membership Card
            </p>

          </div>

        </div>

        <div class="active-badge">
          ACTIVE MEMBER
        </div>

      </div>

      <div class="content">

        <div class="official-label">
          Official Member
        </div>

        <div class="member-name">
          ${esc(memberName)}
        </div>

        <div class="membership-strip">

          <div>

            <div class="label">
              Membership Number
            </div>

            <div class="number">
              ${esc(membershipNo)}
            </div>

          </div>

          <div class="member-since">

            <div class="label">
              Member Since
            </div>

            <strong>
              ${esc(memberSince)}
            </strong>

          </div>

        </div>

        <div class="details">

          <div class="detail">

            <span>
              Business
            </span>

            <strong>
              ${esc(businessName)}
            </strong>

          </div>

          <div class="detail">

            <span>
              Processor Group
            </span>

            <strong>
              ${esc(processorGroup)}
            </strong>

          </div>

          <div class="detail">

            <span>
              Membership Status
            </span>

            <strong>
              Approved
            </strong>

          </div>

          <div class="detail">

            <span>
              Membership Type
            </span>

            <strong>
              TAPA Member
            </strong>

          </div>

        </div>

        <div class="footer">

          <div class="footer-text">

            <strong>
              Tobago Agro-Processors Association
            </strong>

            <br>

            Digital Membership & Processor Registry

          </div>

          <div class="qr-placeholder">
            QR CODE
            <br>
            VERIFY
          </div>

        </div>

      </div>

    </div>

  </div>

  <div class="actions">

    <button
      class="print"
      onclick="window.print()"
    >
      Print / Save as PDF
    </button>

    <button
      class="close"
      onclick="window.close()"
    >
      Close
    </button>

  </div>

</body>
</html>
  `;

  const blob = new Blob(
    [html],
    {
      type: "text/html;charset=utf-8"
    }
  );

  const cardUrl =
    URL.createObjectURL(blob);

  const cardWindow =
    window.open(
      cardUrl,
      "_blank"
    );

  if (!cardWindow) {
    URL.revokeObjectURL(cardUrl);

    alert(
      "Please allow pop-ups for this website to open the membership card."
    );

    return;
  }

  setTimeout(
    () => URL.revokeObjectURL(cardUrl),
    60000
  );
}

// ============================================================
// SAVE REVIEW
// ============================================================

async function saveReview() {
  if (!currentApplicationId) {
    return;
  }

  const status =
    $("reviewStatus")
      ?.value ||
    "Pending";

  const internalNotes =
    $("reviewNotes")
      ?.value ||
    "";

  const message =
    $("reviewMessage");

  if (message) {
    message.textContent =
      "Saving...";
  }

  try {
    const response =
      await fetch(
        `/api/admin/applications/${currentApplicationId}`,
        {
          method: "PATCH",

          credentials:
            "same-origin",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              status,
              internal_notes:
                internalNotes
            })
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Could not save application."
      );
    }

    if (message) {
      message.innerHTML =
        `<strong>
          Saved successfully.
        </strong>`;
    }

    await Promise.all([
      loadDashboard(),
      loadApplications()
    ]);

  } catch (err) {
    console.error(
      "Save review error:",
      err
    );

    if (message) {
      message.innerHTML = `
        <span>
          ${esc(err.message)}
        </span>
      `;
    }
  }
}


window.saveReview =
  saveReview;

async function deleteApplication(id) {
  const confirmed = confirm(
    "Are you sure you want to permanently delete this application? This cannot be undone."
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/admin/applications/${id}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to delete application");
    }

    alert("Application deleted successfully.");

    closeReviewModal();
    await Promise.all([
  loadDashboard(),
  loadApplications()
]);

  } catch (err) {
    console.error("Delete application error:", err);
    alert(err.message || "Unable to delete application");
  }
}

window.deleteApplication = deleteApplication;


// ============================================================
// CLOSE REVIEW MODAL
// ============================================================

function closeReviewModal() {
  const modal =
    $("modal");

  if (!modal) return;

  modal.classList.add(
    "hidden"
  );

  modal.style.display =
    "none";

  currentApplicationId =
    null;
}


window.closeReviewModal =
  closeReviewModal;


if ($("closeModal")) {
  $("closeModal").onclick =
    closeReviewModal;
}


// ============================================================
// PROCESSOR GROUPS IN ADMIN
// ============================================================

async function loadAdminCategories() {
  const target =
    $("categoryAdmin");

  if (!target) return;

  try {
    const response =
      await fetch(
        "/api/public/categories"
      );

    const categories =
      await response.json();

    if (!response.ok) {
      throw new Error(
        "Could not load processor groups."
      );
    }

    target.innerHTML =
      categories
        .map(
          (category) => `
            <span
              class="chip"
              style="
                display:inline-block;
                margin:4px;
                padding:6px 10px;
              "
            >
              ${esc(
                category.name
              )}
            </span>
          `
        )
        .join("");

  } catch (err) {
    console.error(
      err
    );
  }
}


// ============================================================
// ADD GROUP
//
// Current Worker does not yet have an admin category-create API.
// This prevents the button from silently doing nothing.
// ============================================================

const addCategoryBtn =
  $("addCategoryBtn");

if (addCategoryBtn) {
  addCategoryBtn.onclick =
    () => {
      alert(
        "The membership and review system is working. Adding new processor groups will be connected next."
      );
    };
}


// ============================================================
// EXPORT CSV
// ============================================================

const exportBtn =
  $("exportBtn") ||
  $("exportCSV");

if (exportBtn) {
  exportBtn.onclick =
    () => {
      window.location.href =
        "/api/admin/export";
    };
}


// ============================================================
// HELPERS
// ============================================================

function setText(
  id,
  value
) {
  const el = $(id);

  if (el) {
    el.textContent =
      value ?? 0;
  }
}


// ============================================================
// STARTUP
// ============================================================

(async function init() {
  await loadCategories();

  // Default view
  if ($("home")) {
    openView("home");
  }
})();
