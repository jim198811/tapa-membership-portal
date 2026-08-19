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
$("dynamicDeleteApplication")
  ?.addEventListener(
    "click",
    () => deleteApplication(id)
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
    await loadAdmin();

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
